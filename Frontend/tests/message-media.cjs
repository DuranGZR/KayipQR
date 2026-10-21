const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const context = { exports: {}, require };
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/utils.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const parse = context.exports.parseMessageMedia;
const filename = "a".repeat(32) + ".webp";
const signed = `/uploads/${filename}?expires=1792609999&signature=${"b".repeat(64)}`;
for (const content of [`📷 [Fotoğraf / Photo](${signed})`, `[Photo](${signed})`, signed]) {
  assert.equal(parse(content).image, signed);
  assert.equal(parse(content).text, "");
}
assert.equal(parse(`Not: [Fotoğraf](${signed}) Teşekkürler`).text, "Not:  Teşekkürler");
for (const url of ["javascript:alert(1)", "/uploads/../../secret", `/uploads/${filename}?expires=1&signature=invalid`, `//attacker.test/${filename}`]) {
  assert.equal(parse(`[Photo](${url})`).image, null);
}
console.log("Message media: signed photo URLs, bilingual labels, text preservation and unsafe references passed.");
