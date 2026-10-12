// Rewrites the social preview URLs in index.html to absolute ones.
//
// Crawlers (Discord, X, Slack, Facebook) do not resolve relative og:image
// paths, and they do not run JavaScript, so the domain has to be baked into the
// HTML before deploying. Run this once per deployment target:
//
//   node tools/set-og-url.mjs https://user.github.io/phansi-sorter/
//   node tools/set-og-url.mjs https://phansi-sorter.example.workers.dev/
//
// It is idempotent: og:image, twitter:image, og:url and <link rel="canonical">
// are replaced every time, so re-running it after a domain change is enough.

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const indexFile = join(here, "..", "index.html");

// No network access happens here; the URL is only written into the document.
const raw = process.argv[2];
if (!raw) {
  console.error("usage: node tools/set-og-url.mjs <base-url>");
  console.error("example: node tools/set-og-url.mjs https://user.github.io/phansi-sorter/");
  process.exit(1);
}

let base;
try {
  base = new URL(raw);
} catch (error) {
  console.error(`not a valid URL: ${raw}`);
  process.exit(1);
}
if (base.protocol !== "http:" && base.protocol !== "https:") {
  console.error(`only http and https are supported, got ${base.protocol}`);
  process.exit(1);
}
// A preview URL has to be reachable from the outside, so flag the common
// development hosts instead of silently writing them in.
const localHosts = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
if (localHosts.test(base.host)) {
  console.warn(`warning: ${base.host} is not reachable from the internet, previews will not resolve`);
}
if (!base.pathname.endsWith("/")) base.pathname += "/";

const absolute = (relative) => new URL(relative, base).href;
const image = absolute("assets/social/og-card.jpg");
const page = base.href;

let html = await readFile(indexFile, "utf8");
const before = html;

const replaceMeta = (property, value) => {
  const pattern = new RegExp(`(<meta\\s+property="${property}"\\s+content=")[^"]*(")`);
  if (pattern.test(html)) html = html.replace(pattern, `$1${value}$2`);
  else html = html.replace("</head>", `    <meta property="${property}" content="${value}" />\n  </head>`);
};

replaceMeta("og:image", image);
replaceMeta("og:url", page);

const twitter = /(<meta\s+name="twitter:image"\s+content=")[^"]*(")/;
if (twitter.test(html)) html = html.replace(twitter, `$1${image}$2`);

if (/<link\s+rel="canonical"/.test(html)) {
  html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${page}$2`);
} else {
  html = html.replace("</head>", `    <link rel="canonical" href="${page}" />\n  </head>`);
}

if (html === before) {
  console.log("index.html already points at this base URL, nothing changed");
} else {
  await writeFile(indexFile, html, "utf8");
  console.log(`index.html now previews ${page}`);
  console.log(`  og:image        ${image}`);
  console.log(`  twitter:image   ${image}`);
  console.log(`  canonical       ${page}`);
}
