// Zero dependency static file server for local development.
//
// The app is plain HTML/CSS/ES modules, so it needs nothing more than a server
// that hands out files with the right content types (ES modules do not load
// over file://).
//
// Run: node tools/serve.mjs [port]

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] || 4173);
const host = "127.0.0.1";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { allow: "GET, HEAD" }).end("method not allowed");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || host}`);
  const requested = decodeURIComponent(url.pathname);
  const relative = normalize(requested === "/" ? "index.html" : requested.replace(/^\/+/, ""));
  const target = resolve(join(root, relative));

  // Refuse anything that escapes the project directory.
  if (target !== root && !target.startsWith(root + sep)) {
    res.writeHead(403).end("forbidden");
    return;
  }

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      res.writeHead(404).end("not found");
      return;
    }
    const body = await readFile(target);
    res.writeHead(200, {
      "content-type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "content-length": body.length,
      "cache-control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
  }
});

server.listen(port, host, () => {
  console.log(`PhansiSorter on http://${host}:${port}/`);
});
