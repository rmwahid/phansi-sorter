// Syntax gate for every shipped module. Views and main.js touch the DOM, so
// they cannot be imported under node; `node --check` still parses them, which
// catches the typo class of bug without a bundler or linter dependency.

import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) out.push(...(await walk(full)));
    else if (entry.endsWith(".js") || entry.endsWith(".mjs")) out.push(full);
  }
  return out;
};

test("every module parses", async () => {
  const files = [...(await walk(join(root, "js"))), ...(await walk(join(root, "tools")))];
  assert.ok(files.length >= 8, `expected the app modules, found ${files.length}`);

  for (const file of files) {
    try {
      await run(process.execPath, ["--check", file]);
    } catch (error) {
      assert.fail(`${file} failed to parse:\n${error.stderr || error.message}`);
    }
  }
});

test("the stylesheet is balanced and references existing pixel assets", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(join(root, "css", "style.css"), "utf8");

  const open = (css.match(/{/g) || []).length;
  const close = (css.match(/}/g) || []).length;
  assert.equal(open, close, `unbalanced braces in style.css: ${open} open, ${close} close`);

  const referenced = new Set();
  for (const match of css.matchAll(/url\("\.\.\/assets\/([^"]+)"\)/g)) referenced.add(match[1]);
  assert.ok(referenced.size >= 4, "expected the stylesheet to use the generated assets");
  for (const asset of referenced) {
    try {
      await stat(join(root, "assets", asset));
    } catch (error) {
      assert.fail(`style.css points at a missing asset: ${asset}`);
    }
  }
});

test("every glyph name used by the views exists", async () => {
  const { readFile } = await import("node:fs/promises");
  const files = await walk(join(root, "js"));
  const sprites = new Set();
  const marks = new Set();

  for (const file of files) {
    const source = await readFile(file, "utf8");
    // Literal uses only; names passed through variables are covered by the
    // generated-sprite list below.
    for (const match of source.matchAll(/(?:glyph|ornamentRow)\(\s*"([a-z0-9_]+)"/g)) {
      sprites.add(match[1]);
    }
    for (const match of source.matchAll(/brandMark\(\s*"([a-z0-9_-]+)"/g)) marks.add(match[1]);
  }

  assert.ok(sprites.size >= 3, `expected glyph usage, found ${sprites.size}`);
  for (const name of sprites) {
    try {
      await stat(join(root, "assets", "pixel", `${name}.svg`));
    } catch (error) {
      assert.fail(`glyph("${name}") has no generated asset`);
    }
  }

  assert.ok(marks.size >= 1, `expected brand marks, found ${marks.size}`);
  for (const name of marks) {
    try {
      await stat(join(root, "assets", "logo", `phantomsiita-${name}.svg`));
    } catch (error) {
      assert.fail(`brandMark("${name}") has no asset in assets/logo`);
    }
  }
  // butterfly() picks between these two at random, so both must exist.
  for (const name of ["butterfly-01", "butterfly-02"]) {
    await stat(join(root, "assets", "logo", `phantomsiita-${name}.svg`));
  }

  // The generator must have produced the whole sprite set.
  for (const sprite of [
    "arrow", "bug", "butterfly", "clover", "cross", "cursor", "diamond",
    "heart", "lace", "skull", "spade", "star", "tile",
  ]) {
    await stat(join(root, "assets", "pixel", `${sprite}.svg`));
  }
  await stat(join(root, "assets", "pixel", "cursor.png"));
});

test("every class name used by the views is defined in the stylesheet", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(join(root, "css", "style.css"), "utf8");
  const files = await walk(join(root, "js"));

  const missing = new Set();
  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/class:\s*"([^"$`]+)"/g)) {
      for (const token of match[1].split(/\s+/).filter(Boolean)) {
        if (!css.includes(`.${token}`)) missing.add(`${token} (${file.replace(root, "")})`);
      }
    }
  }

  assert.deepEqual([...missing], [], `class names without styles:\n${[...missing].join("\n")}`);
});

test("index.html references the files that exist", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(join(root, "index.html"), "utf8");
  const local = [...html.matchAll(/(?:src|href)="((?!https?:|#)[^"]+)"/g)].map((match) => match[1]);
  assert.ok(local.length >= 3, "expected local references in index.html");

  for (const target of local) {
    try {
      await stat(join(root, target));
    } catch (error) {
      assert.fail(`index.html points at a missing file: ${target}`);
    }
  }
});

test("the social preview is complete", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(join(root, "index.html"), "utf8");
  const content = (attr, value) =>
    (html.match(new RegExp(`<meta\\s+${attr}="${value}"\\s+content="([^"]*)"`)) || [])[1];

  for (const key of ["og:title", "og:description", "og:image", "og:type"]) {
    assert.ok(content("property", key), `missing ${key}`);
  }
  assert.equal(content("name", "twitter:card"), "summary_large_image");
  assert.ok(content("name", "twitter:image"), "missing twitter:image");

  // The image path may be relative (local use) or absolute (after
  // `node tools/set-og-url.mjs <base-url>`); either way the file must exist.
  for (const key of ["og:image", "twitter:image"]) {
    const attr = key.startsWith("og:") ? "property" : "name";
    const value = content(attr, key);
    const path = value.startsWith("http") ? new URL(value).pathname : value;
    const relative = path.replace(/^\//, "").replace(/^.*?(assets\/)/, "$1");
    await stat(join(root, relative));
  }
});
