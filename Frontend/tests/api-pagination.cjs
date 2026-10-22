const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const code = ts.transpileModule(fs.readFileSync("src/lib/api.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function client(fetch) {
  const context = { exports: {}, process: { env: { NEXT_PUBLIC_API_URL: "https://api.test/api/v1" } }, URLSearchParams, fetch, AbortController, setTimeout, clearTimeout };
  vm.runInNewContext(code, context);
  return context.exports;
}

async function run() {
  const calls = [];
  const api = client(async raw => {
    const url = new URL(raw);
    calls.push(url);
    const offset = Number(url.searchParams.get("offset"));
    assert.equal(url.searchParams.get("limit"), "20");
    assert.equal(url.searchParams.get("status"), "lost");
    const page = offset === 0 ? Array.from({ length: 20 }, (_, id) => ({ id: String(id) })) : [{ id: "last" }];
    return { ok: true, status: 200, json: async () => page };
  });
  assert.equal((await api.itemsApi.list("lost")).length, 20);
  assert.equal(calls.length, 1, "List opening fetches one page only");
  await api.itemsApi.list("lost", undefined, 20);
  assert.equal(calls[1].searchParams.get("offset"), "20");

  const historyCalls = [];
  const history = client(async raw => {
    const url = new URL(raw); historyCalls.push(url);
    const older = url.searchParams.has("before");
    return { ok: true, status: 200, json: async () => ({
      id: "conversation", status: "active",
      messages: older ? [{ id: "old", created_at:"2026-10-21T10:00:00Z" }] : [{ id: "new", created_at:"2026-10-21T10:01:00Z" }],
      next_cursor: older ? null : "cursor",
    }) };
  });
  const initial = await history.publicApi.getFinderConversation("finder_token");
  assert.equal(initial.messages.map(message => message.id).join(","), "new");
  assert.equal(initial.next_cursor, "cursor");
  assert.equal(historyCalls.length, 1, "Opening a long conversation must fetch only the latest page");
  const earlier = await history.publicApi.getOlderFinderMessages("finder_token", initial.next_cursor);
  assert.equal(historyCalls[1].searchParams.get("before"), "cursor");
  const combined = history.mergeChatDetails(initial, earlier, true);
  assert.equal(combined.messages.map(message => message.id).join(","), "old,new");
  assert.equal(combined.next_cursor, null);
  assert.equal(history.mergeChatDetails(combined, {...initial, messages:[]}).next_cursor, null,
    "A polling response cannot overwrite an older-page cursor");

  const loop = client(async () => ({ ok: true, status: 200, json: async () => ({ messages: [], next_cursor: "same" }) }));
  await assert.rejects(() => loop.publicApi.getFinderConversation("token", {messages:[{id:"last"}]}), /sayfalaması/);
  const deltaCalls = [];
  const delta = client(async raw => {
    const url = new URL(raw); deltaCalls.push(url);
    assert.equal(url.searchParams.has("before"), false);
    return {ok:true, status:200, json:async () => ({id:"conversation", status:"active", messages: [{id:"new", content:"Yeni", created_at:"2026-10-21T10:01:00Z", sender_type:"finder"}], next_cursor:null, read_through:"2026-10-21T10:00:00Z"})};
  });
  const previous = {id:"conversation", next_cursor:"older-cursor", messages:[{id:"old", content:"Eski", sender_type:"owner", created_at:"2026-10-21T10:00:00Z", is_read:false}]};
  const updated = await delta.chatApi.getDetails("conversation", previous);
  assert.equal(deltaCalls.length, 1);
  assert.equal(deltaCalls[0].searchParams.get("after"), "old");
  assert.equal(updated.messages.map(message=>message.id).join(","), "old,new");
  assert.equal(updated.messages[0].is_read, true);
  assert.equal(updated.next_cursor, "older-cursor");
  const expiredCalls = [];
  const expired = client(async raw => {
    const url = new URL(raw); expiredCalls.push(url);
    return {ok:true, status:200, json:async () => ({id:"conversation", messages:[], next_cursor:null})};
  });
  await expired.chatApi.getDetails("conversation", {...previous, messages:[{...previous.messages[0], content:"/uploads/" + "a".repeat(32) + ".jpg?expires=1&signature=old"}]});
  assert.equal(expiredCalls.length, 1);
  assert.equal(expiredCalls[0].searchParams.get("after"), "old", "Expired images must not restart history pagination");
  await expired.chatApi.getMessage("conversation", "old");
  assert.equal(expiredCalls[1].pathname, "/api/v1/conversations/conversation/messages/old");
  console.log("API pagination: bounded initial load, older pages, polling races, expired media and cursor-loop protection passed.");
}

run().catch(error => { console.error(error); process.exitCode = 1; });
