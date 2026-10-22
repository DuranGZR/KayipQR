const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const compile = file => ts.transpileModule(fs.readFileSync(`src/lib/${file}.ts`, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function moduleFor(file, context = {}) {
  const sandbox = { exports: {}, URL, URLSearchParams, ...context };
  vm.runInNewContext(compile(file), sandbox);
  return sandbox.exports;
}
const navigation = moduleFor("navigation");
for (const target of ["https://evil.org", "//evil.org", "/\\evil.org", "/unknown", "/studio\n"]) {
  assert.equal(navigation.safeReturnPath(target), "/dashboard");
}
assert.equal(navigation.safeReturnPath("/studio?edit=123"), "/studio?edit=123");
const qr = moduleFor("qrPolicy");
assert.notEqual(qr.qrColorError("#fff", "#fff"), "");
assert.notEqual(qr.qrColorError("#ffffff", "#eeeeee"), "");
assert.equal(qr.qrColorError("#000", "#fff"), "");

const storage = new Map();
const token = `test.${Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).toString("base64url")}.signature`;
const location = { search: `?token=${token}&redirect=%2Fstudio`, pathname: "/verify-email" };
const history = { state: { next: "preserved" }, replaceState(state) { this.state = state; location.search = ""; } };
const sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const flow = moduleFor("verificationFlow", { require: () => navigation, window: { location, history }, sessionStorage,
  crypto: { randomUUID: () => "flow-1" }, atob: text => Buffer.from(text, "base64").toString() });
assert.equal(flow.readVerificationFlow().token, token);
assert.equal(location.search, "", "Token is removed from the URL");
assert.equal(history.state.next, "preserved", "Next navigation state survives URL cleanup");
assert.equal(flow.readVerificationFlow().token, token, "Refresh/Strict Mode keeps the verification link usable");
assert.equal(flow.readVerificationFlow().redirect, "/studio");
history.state = {};
assert.equal(flow.readVerificationFlow().token, "", "An unrelated visit cannot reuse the cached link");
history.state = { kqVerification: "flow-1" };
const stored = JSON.parse(storage.get("kayipqr_verification_flow"));
storage.set("kayipqr_verification_flow", JSON.stringify({ ...stored, expires: 0 }));
assert.equal(flow.readVerificationFlow().token, "", "Expired continuation is discarded");

async function run() {
  let calls = 0;
  const api = moduleFor("api", { process: { env: {} }, AbortController, setTimeout, clearTimeout,
    fetch: async () => { calls++; throw new TypeError("Failed to fetch"); } });
  await assert.rejects(() => api.apiFetch("https://api.test"), /Sunucuya bağlanılamadı/);
  assert.equal(calls, 1, "Failures never auto-retry mutations");
  const timeout = moduleFor("api", { process: { env: {} }, AbortController, setTimeout, clearTimeout,
    fetch: async (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("abort")))) });
  await assert.rejects(() => timeout.apiFetch("https://api.test", {}, 2), /zaman aşımına/);
  const cache = moduleFor("api", { process: { env: {} }, AbortController, setTimeout, clearTimeout,
    fetch: async () => { calls++; return { ok: true, status: 200, json: async () => ({ id: "owner" }) }; } });
  calls = 0;
  await Promise.all([cache.authApi.getMe("test-token"), cache.authApi.getMe("test-token")]);
  assert.equal(calls, 1, "Concurrent profile readers share one request");
  console.log("UX flows: QR contrast, safe redirects, verification refresh/expiry, timeout, no retries and profile deduplication passed.");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
