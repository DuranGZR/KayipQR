const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const timers = new Map();
const listeners = new Map();
let id = 0;
const context = {
  exports: {}, navigator: { onLine: true },
  document: { hidden: false, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
  window: { addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) },
  setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: key => timers.delete(key),
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/visiblePolling.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
async function tick() { const [key, fn] = timers.entries().next().value; timers.delete(key); await fn(); }
(async () => {
  let calls = 0;
  const stop = context.exports.startVisiblePolling(async () => { calls++; }, 15000, false);
  await tick(); assert.equal(calls, 1);
  context.document.hidden = true;
  await tick(); assert.equal(calls, 1);
  context.document.hidden = false; context.navigator.onLine = false;
  await tick(); assert.equal(calls, 1);
  context.navigator.onLine = true;
  listeners.get("online")(); await Promise.resolve(); await Promise.resolve();
  assert.equal(calls, 2);
  stop(); assert.equal(timers.size, 0); assert.equal(listeners.size, 0);
  let release;
  const stop2 = context.exports.startVisiblePolling(() => { calls++; return new Promise(resolve => { release = resolve; }); }, 15000);
  const runningCalls = calls;
  listeners.get("online")();
  assert.equal(calls, runningCalls); // no concurrent fetch while the previous one is pending
  stop2(); release(); await Promise.resolve(); await Promise.resolve();
  assert.equal(timers.size, 0);
  console.log("Visible polling: hidden/offline pause, resume, overlap prevention and cleanup passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
