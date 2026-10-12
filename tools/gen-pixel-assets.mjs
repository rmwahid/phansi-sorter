// Pixel asset generator for PhansiSorter.
//
// Every sprite in assets/pixel is generated from the bitmap strings below, so
// the artwork is hand-authored here instead of copied from anywhere. Outputs:
//   - SVG (crisp at any size, rendered with shape-rendering="crispEdges")
//   - PNG (cursors need a raster image)
//
// The PNG encoder is a tiny RGBA writer on top of node:zlib, which keeps the
// project free of third party packages.
//
// Run: node tools/gen-pixel-assets.mjs

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "assets", "pixel");

/* ------------------------------------------------------------------ sprites */

// '.' transparent, '#' primary, 'o' secondary, '+' highlight
const SPRITES = {
  butterfly: {
    size: 16,
    colors: { "#": "#e8e8e8", o: "#cc1515", "+": "#050406" },
    rows: [
      "................",
      "..##........##..",
      ".#o##......##o#.",
      "##ooo#.++.#####o",
      "#ooo#.++..##ooo#",
      "#oo#..++.++.#oo#",
      ".#o#..++.++.#o#.",
      "..##..++.++..##.",
      "...#..++.++..#..",
      "....#.++.++.#...",
      ".....+++++++....",
      "......++.++.....",
      ".......#..#.....",
      "................",
      "................",
      "................",
    ],
  },
  bug: {
    size: 12,
    colors: { "#": "#a5a5a5", o: "#050406" },
    rows: [
      "..#......#..",
      "...#....#...",
      "#..######..#",
      ".#oooooooo#.",
      "#o#oooooo#o#",
      "#oooooooooo#",
      "#o#oooooo#o#",
      ".#oooooooo#.",
      "#..######..#",
      "...#....#...",
      "..#......#..",
      "............",
    ],
  },
  tile: {
    size: 16,
    colors: { "#": "#d9b3b3", o: "#c79a9a" },
    rows: [
      "#..............#",
      "................",
      "....o......o....",
      "...o#o....o#o...",
      "....o......o....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "....o......o....",
      "...o#o....o#o...",
      "....o......o....",
      "................",
      "................",
      "#..............#",
    ],
  },
  lace: {
    size: 16,
    colors: { "#": "#e8b7b7", o: "#f6dede" },
    rows: [
      "##..##..##..##..",
      "###.###.###.###.",
      "#o###o###o###o##",
      "#o###o###o###o##",
      "###.###.###.###.",
      ".#...o#...#o..#.",
      "......#....#....",
      "................",
    ],
  },
  diamond: {
    size: 7,
    colors: { "#": "#cc1515" },
    rows: [
      "...#...",
      "..###..",
      ".#####.",
      "#######",
      ".#####.",
      "..###..",
      "...#...",
    ],
  },
  heart: {
    size: 8,
    colors: { "#": "#ae007f" },
    rows: [
      ".##..##.",
      "########",
      "########",
      "########",
      ".######.",
      "..####..",
      "...##...",
      "........",
    ],
  },
  star: {
    size: 9,
    colors: { "#": "#fc8e8e" },
    rows: [
      "....#....",
      "...###...",
      "#########",
      ".#####...",
      "..###....",
      ".#####...",
      ".##.##...",
      ".........",
      ".........",
    ],
  },
  spade: {
    size: 8,
    colors: { "#": "#050406" },
    rows: [
      "...##...",
      "..####..",
      "########",
      "########",
      ".######.",
      "...##...",
      "..####..",
      "........",
    ],
  },
  clover: {
    size: 8,
    colors: { "#": "#4e9882" },
    rows: [
      ".##..##.",
      "###..###",
      ".######.",
      "..####..",
      "..####..",
      ".##..##.",
      ".#....#.",
      "........",
    ],
  },
  cross: {
    size: 8,
    colors: { "#": "#a5a5a5" },
    rows: [
      "##....##",
      ".##..##.",
      "..####..",
      "...##...",
      "..####..",
      ".##..##.",
      "##....##",
      "........",
    ],
  },
  arrow: {
    size: 8,
    colors: { "#": "#050406" },
    rows: [
      "........",
      "...#....",
      "..##....",
      ".###....",
      "########",
      ".###....",
      "..##....",
      "...#....",
    ],
  },
  skull: {
    size: 10,
    colors: { "#": "#e8e8e8", o: "#050406" },
    rows: [
      "..######..",
      ".########.",
      "##########",
      "#oo####oo#",
      "#oo####oo#",
      "##########",
      ".###oo###.",
      "..######..",
      "...####...",
      "..........",
    ],
  },
  cursor: {
    size: 16,
    colors: { "#": "#f4f4f4", o: "#050406" },
    rows: [
      "o...............",
      "oo..............",
      "o#o.............",
      "o##o............",
      "o###o...........",
      "o####o..........",
      "o#####o.........",
      "o######o........",
      "o#######o.......",
      "o#########o.....",
      "o#####ooooo.....",
      "o##o#o..........",
      "o#o.o#o.........",
      "oo...o#o........",
      "o.....o#o.......",
      "......ooo.......",
    ],
  },
};

/* --------------------------------------------------------------- svg output */

const hexToRgba = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
};

const toSvg = (sprite) => {
  const { size, rows, colors } = sprite;
  const byColor = new Map();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const hex = colors[ch];
      if (!hex) return;
      const list = byColor.get(hex) || [];
      // Rows may overlap when a rect is emitted, so each pixel is its own rect
      // only when needed; horizontal runs are merged to keep the file small.
      const prev = list[list.length - 1];
      if (prev && prev.y === y && prev.x + prev.w === x) prev.w += 1;
      else list.push({ x, y, w: 1 });
      byColor.set(hex, list);
    });
  });

  const rects = [...byColor.entries()]
    .map(
      ([hex, list]) =>
        `  <g fill="${hex}">\n` +
        list
          .map((r) => `    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="1"/>`)
          .join("\n") +
        "\n  </g>"
    )
    .join("\n");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${rows.length}" ` +
    `viewBox="0 0 ${size} ${rows.length}" shape-rendering="crispEdges">\n${rects}\n</svg>\n`
  );
};

/* --------------------------------------------------------------- png output */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const toPng = (sprite) => {
  const { size, rows, colors } = sprite;
  const height = rows.length;
  const raw = Buffer.alloc((size * 4 + 1) * height);
  let p = 0;
  for (const row of rows) {
    raw[p] = 0; // filter: none
    p += 1;
    for (let x = 0; x < size; x += 1) {
      const hex = colors[row[x]];
      const [r, g, b, a] = hex ? hexToRgba(hex) : [0, 0, 0, 0];
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = a;
      p += 4;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

/* ------------------------------------------------------------------- driver */

mkdirSync(outDir, { recursive: true });

let n = 0;
for (const [name, sprite] of Object.entries(SPRITES)) {
  writeFileSync(join(outDir, `${name}.svg`), toSvg(sprite), "utf8");
  n += 1;
  if (name === "cursor") {
    writeFileSync(join(outDir, `${name}.png`), toPng(sprite));
    n += 1;
  }
}

console.log(`wrote ${n} pixel assets to ${outDir}`);
