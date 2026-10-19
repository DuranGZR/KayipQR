const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const code = ts.transpileModule(fs.readFileSync("src/lib/api.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function client(fetch) {
  const context = { exports: {}, process: { env: { NEXT_PUBLIC_API_URL: "https://api.test/api/v1" } }, URLSearchParams, fetch };
  vm.runInNewContext(code, context);
  return context.exports;
}

async function run() {
  const calls = [];
  const api = client(async raw => {
    const url = new URL(raw);
    calls.push(url);
    const offset = Number(url.searchParams.get("offset"));
    assert.equal(url.searchParams.get("limit"), "100");
    assert.equal(url.searchParams.get("status"), "lost");
    const page = offset === 0 ? Array.from({ length: 100 }, (_, id) => ({ id: String(id) })) : [{ id: "last" }];
    return { ok: true, status: 200, json: async () => page };
  });
  assert.equal((await api.itemsApi.list("lost")).length, 101);
  assert.equal(calls[1].searchParams.get("offset"), "100");

  const history = client(async raw => {
    const url = new URL(raw);
    const older = url.searchParams.has("before");
    return { ok: true, status: 200, json: async () => ({
      id: "conversation", status: "active",
      messages: older ? [{ id: "old" }] : [{ id: "new" }],
      next_cursor: older ? null : "cursor",
    }) };
  });
  const messages = (await history.publicApi.getFinderConversation("finder_token")).messages;
  assert.equal(messages.map(message => message.id).join(","), "old,new");

  const loop = client(async () => ({ ok: true, status: 200, json: async () => ({ messages: [], next_cursor: "same" }) }));
  await assert.rejects(() => loop.publicApi.getFinderConversation("token"), /sayfalaması/);
  console.log("API pagination: item batches, chronological history and cursor-loop protection passed.");
}

run().catch(error => { console.error(error); process.exitCode = 1; });
