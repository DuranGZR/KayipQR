import assert from "node:assert/strict";

// Run against a built local server or production; no account or API writes.
const target = (process.argv[2] || "http://localhost:3014").replace(/\/$/, "");
const publicPaths = ["/", "/rehber", "/rehber/kayip-esya-qr-etiketi", "/rehber/valiz-qr-etiketi", "/rehber/anahtarlik-qr-etiketi", "/privacy", "/terms", "/kvkk", "/cookies"];
const privatePaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/auth/google/callback", "/dashboard", "/dashboard/seo-check", "/messages", "/settings", "/studio", "/q/seo-check-not-a-real-code"];
const pages = new Map();
for (const path of [...publicPaths, ...privatePaths]) {
  const response = await fetch(`${target}${path}`);
  assert.equal(response.status, 200, `${path}: HTTP response`);
  const html = await response.text();
  pages.set(path, html);
  if (privatePaths.includes(path)) {
    assert.match(response.headers.get("x-robots-tag") || "", /noindex/, `${path}: header`);
    assert.match(html, /<meta name="robots" content="[^"]*noindex/, `${path}: meta`);
    assert.doesNotMatch(html, /rel="canonical"/, `${path}: no inherited homepage canonical`);
  } else {
    assert.doesNotMatch(html, /(?:name="robots" content="[^"]*noindex|X-Robots-Tag.*noindex)/i, `${path}: indexable`);
    assert.match(html, /<meta name="description" content="[^"]+"/, `${path}: description`);
    assert.match(html, /<meta property="og:image" content="https?:\/\/[^\"]+"/, `${path}: image`);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one h1`);
  }
}
const homeCanonical = pages.get("/").match(/<link rel="canonical" href="([^"]+)"/)[1];
const origin = new URL(homeCanonical).origin;
if (process.env.SEO_EXPECTED_ORIGIN) assert.equal(origin, new URL(process.env.SEO_EXPECTED_ORIGIN).origin, "canonical origin");
const titles = new Set();
for (const path of publicPaths) {
  const html = pages.get(path);
  assert.equal(new URL(html.match(/<link rel="canonical" href="([^"]+)"/)[1]).href, new URL(`${origin}${path}`).href, `${path}: canonical`);
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  assert(!titles.has(title), `${path}: unique title`);
  titles.add(title);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) JSON.parse(json);
}
assert(pages.get("/").includes('href="/rehber"'), "guide directory linked from homepage footer");
assert(!pages.get("/").includes('id="guide-links-title"'), "no guide cards on homepage");
for (const path of publicPaths.filter(path => path.startsWith("/rehber/"))) {
  assert(pages.get("/rehber").includes(`href="${path}"`), `${path}: linked from guide directory`);
  assert.match(pages.get(path), /"@type":"Article"/, `${path}: article schema`);
  assert.match(pages.get(path), /"@type":"BreadcrumbList"/, `${path}: breadcrumb schema`);
  assert.match(pages.get(path), /"url":"[^\"]+\/opengraph-image"|"image":"[^\"]+\/opengraph-image"/, `${path}: structured image`);
}
const sitemap = await (await fetch(`${target}/sitemap.xml`)).text();
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.deepEqual(locations.sort(), publicPaths.map(path => `${origin}${path}`).sort(), "only public pages in sitemap");
const robots = await (await fetch(`${target}/robots.txt`)).text();
assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert(!/Disallow: \/(?:q|login|dashboard|settings)/.test(robots), "noindex must be crawlable");
const missingGuide = await fetch(`${target}/rehber/seo-check-not-a-guide`);
assert.equal(missingGuide.status, 404, "unknown guide returns 404");
const image = await fetch(`${target}/opengraph-image`);
assert.equal(image.status, 200);
assert.match(image.headers.get("content-type"), /image\/png/);
const png = Buffer.from(await image.arrayBuffer());
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
console.log(`SEO checks passed: ${publicPaths.length} public pages, ${privatePaths.length} noindex routes, sitemap, robots, structured data, 404, 1200×630 sharing image. Canonical origin: ${origin}`);
