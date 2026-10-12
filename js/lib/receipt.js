// Ranking receipt renderer.
//
// Draws the result as a "cursed ticket" straight onto a canvas: no DOM
// snapshot, no external library, so the export is fast, exactly as tall as its
// content and identical on every browser. The barcode is deterministic (it is
// decoration, not data).
//
// The brand artwork (wordmark and butterflies) is loaded from assets/logo and
// recoloured through a canvas tint, so the receipt keeps the same shapes as the
// site while staying printable on pink paper. The site address printed at the
// bottom comes from the page itself, never from a constant, so it follows
// whatever domain the app is served from.

import { songReading } from "../data/songs.js";

const SCALE = 2;
const W = 720;
const PAD = 56;
const X0 = PAD;
const X1 = W - PAD;
const PAPER = "#edcfcf";
const INK = "#050406";
const MID = "#6d4a4a";
const MUTE = "#5f5f56";
const FAINT = "#a88282";
const FRAME = "#600e0e";
const DECOR = "#b87272";

const FONT = '"PixelMplus12", "MS Gothic", "Yu Gothic", monospace';

const ensureFonts = async () => {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`400 16px ${FONT}`),
      document.fonts.load(`700 26px ${FONT}`),
    ]);
    await document.fonts.ready;
  } catch (error) {
    // Rendering falls back to a system monospace font.
  }
};

const pad2 = (n) => String(n).padStart(2, "0");

/** Load one image, resolving to null when it cannot be used. */
const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.decoding = "sync";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Recolour a loaded image to a flat colour, keeping its alpha shape. */
const tint = (img, color) => {
  if (!img) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
};

/** Brand artwork for the receipt header and footer, or nulls when missing. */
const loadArt = async () => {
  const [logo, wide, tall] = await Promise.all([
    loadImage("assets/logo/phantomsiita-wordmark.svg"),
    loadImage("assets/logo/phantomsiita-butterfly-01.svg"),
    loadImage("assets/logo/phantomsiita-butterfly-02.svg"),
  ]);
  // Which wing design goes where is cosmetic, so it varies per export.
  const first = Math.random() < 0.5 ? wide : tall;
  const second = first === wide ? tall : wide;
  return {
    logo: tint(logo, INK),
    left: tint(first, DECOR),
    right: tint(second, DECOR),
    small: tint(wide, DECOR),
  };
};

/** Fit an image into a box, keeping its aspect ratio. */
const fit = (img, boxW, boxH) => {
  const ratio = Math.min(boxW / img.width, boxH / img.height);
  return { w: img.width * ratio, h: img.height * ratio };
};

const drawFitted = (ctx, img, centerX, centerY, boxW, boxH) => {
  if (!img) return { w: 0, h: 0 };
  const { w, h } = fit(img, boxW, boxH);
  ctx.drawImage(img, centerX - w / 2, centerY - h / 2, w, h);
  return { w, h };
};

/**
 * @param {Array<{japanese:string, romaji:string, english:string, origin:string}>} items
 * @param {{finishedAt:string|null, url?:string}} meta
 * @returns {Promise<HTMLCanvasElement>}
 */
export const renderReceipt = async (items, meta) => {
  await ensureFonts();
  const art = await loadArt();

  const rows = items.filter(Boolean);
  const rowPitch = 54;
  const subOffset = 20;

  const frame = 10;
  const logoBoxH = 34;
  const logoTop = frame + 34;
  const logoMid = logoTop + logoBoxH / 2;
  const tagY = logoTop + logoBoxH + 30;
  const ruleTop = tagY + 24;
  const row0 = ruleTop + 46;
  const lastRowY = row0 + (rows.length - 1) * rowPitch;
  const ruleBottom = lastRowY + 42;
  const totalY = ruleBottom + 40;
  const thanksY = totalY + 56;
  const barTop = thanksY + 24;
  const barH = 46;
  const cap1Y = barTop + barH + 34;
  const cap2Y = cap1Y + 27;
  const H = Math.ceil(cap2Y + 60);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * SCALE);
  canvas.height = Math.round(H * SCALE);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.scale(SCALE, SCALE);
  ctx.textBaseline = "alphabetic";

  // Paper + dot grid.
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(5, 4, 6, 0.07)";
  for (let y = frame; y < H - frame; y += 16) {
    for (let x = frame; x < W - frame; x += 16) ctx.fillRect(x, y, 1, 1);
  }

  // Chunky pixel frame: outer 3px, inner 1px.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(frame / 2, frame / 2, W - frame, H - frame);
  ctx.strokeStyle = FRAME;
  ctx.lineWidth = 1;
  ctx.strokeRect(frame + 4.5, frame + 4.5, W - 2 * frame - 9, H - 2 * frame - 9);

  const setFont = (size, weight) => {
    ctx.font = `${weight ? `${weight} ` : ""}${size}px ${FONT}`;
  };

  const spacedWidth = (text, size, spacing, weight) => {
    setFont(size, weight);
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    return widths.reduce((sum, w) => sum + w, 0) + spacing * Math.max(0, text.length - 1);
  };

  const spacedCenter = (text, y, size, spacing, color, weight) => {
    setFont(size, weight);
    ctx.fillStyle = color;
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((sum, w) => sum + w, 0) + spacing * Math.max(0, text.length - 1);
    let x = (W - total) / 2;
    for (let i = 0; i < text.length; i += 1) {
      ctx.fillText(text[i], x, y);
      x += widths[i] + spacing;
    }
  };

  const text = (value, x, y, size, color, weight, align = "left") => {
    setFont(size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
    ctx.textAlign = "left";
  };

  const dottedRule = (y) => {
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(X0, y);
    ctx.lineTo(X1, y);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Dotted leader between a title and its value. A zero length dash stays
  // invisible with a butt cap, so the dots are one pixel wide and rounded.
  const leader = (fromX, toX, y) => {
    if (toX <= fromX) return;
    ctx.strokeStyle = FAINT;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.setLineDash([1, 5]);
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.lineTo(toX, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = "butt";
  };

  // Header: the real wordmark, flanked by butterflies. Falls back to the plain
  // spaced title when the artwork could not be loaded.
  const centre = W / 2;
  if (art.logo) {
    const logo = drawFitted(ctx, art.logo, centre, logoMid, 210, logoBoxH);
    const gap = logo.w / 2 + 46;
    drawFitted(ctx, art.left, centre - gap, logoMid, 66, 40);
    drawFitted(ctx, art.right, centre + gap, logoMid, 66, 40);
  } else {
    spacedCenter("PHANTOM SIITA", logoMid + 11, 30, 6, INK, 700);
  }

  // Storefront caption, shrunk if the address is long.
  let tagSize = 13;
  let tagSpacing = 3;
  const tag = "SONG SORTER RECEIPT";
  while (spacedWidth(tag, tagSize, tagSpacing) > X1 - X0 && tagSize > 9) {
    tagSize -= 1;
    tagSpacing = Math.max(1, tagSpacing - 0.5);
  }
  spacedCenter(tag, tagY, tagSize, tagSpacing, MID);
  dottedRule(ruleTop);

  // Song rows: rank on the right, Japanese title left, reading below.
  rows.forEach((song, index) => {
    const y = row0 + index * rowPitch;
    const rank = pad2(index + 1);
    setFont(18);
    const titleW = ctx.measureText(song.japanese).width;
    setFont(18, 700);
    const rankW = ctx.measureText(rank).width;

    text(song.japanese, X0, y, 18, INK);
    leader(X0 + titleW + 10, X1 - rankW - 12, y - 5);
    text(rank, X1, y, 18, INK, 700, "right");
    // Same second line as the app: romaji reading plus the English title when
    // it differs ("Mashou Shoujo · Devilish Girl").
    text(songReading(song), X0, y + subOffset, 13, MID);
  });

  dottedRule(ruleBottom);
  text("TOTAL SONGS", X0, totalY, 15, INK, 700);
  const totalLabelW = ctx.measureText("TOTAL SONGS").width;
  const totalValue = String(rows.length);
  setFont(15, 700);
  leader(X0 + totalLabelW + 10, X1 - ctx.measureText(totalValue).width - 12, totalY - 5);
  text(totalValue, X1, totalY, 15, INK, 700, "right");

  // Closing line, framed by two small butterflies.
  const thanksWidth = spacedWidth("THANK YOU FOR SORTING \u266A", 15, 4, 700);
  if (thanksWidth + 90 < X1 - X0) {
    drawFitted(ctx, art.small, centre - thanksWidth / 2 - 34, thanksY - 5, 46, 28);
    drawFitted(ctx, art.small, centre + thanksWidth / 2 + 34, thanksY - 5, 46, 28);
  }
  spacedCenter("THANK YOU FOR SORTING \u266A", thanksY, 15, 4, INK, 700);

  // Decorative barcode.
  const bars = [];
  let barWidth = 0;
  for (let i = 0; i < 64; i += 1) {
    const width = 1 + Math.floor(Math.abs(Math.sin(i * 1.87)) * 3);
    bars.push(width);
    barWidth += width;
  }
  let bx = (W - barWidth - 2 * (bars.length - 1)) / 2;
  ctx.fillStyle = INK;
  for (const width of bars) {
    ctx.fillRect(Math.round(bx), barTop, width, barH);
    bx += width + 2;
  }

  // Footer: the address of the page this receipt came from. Read from the
  // browser at export time, so a github.io / workers.dev / custom domain all
  // print correctly without touching this file.
  const address = (meta.url || location.origin + location.pathname)
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .toUpperCase();
  let capSize = 12;
  let capSpacing = 2;
  while (spacedWidth(address, capSize, capSpacing) > X1 - X0 && capSize > 8) {
    capSize -= 1;
    capSpacing = Math.max(0.5, capSpacing - 0.3);
  }
  spacedCenter(address, cap1Y, capSize, capSpacing, MUTE, 700);

  const printed = meta.finishedAt
    ? new Date(meta.finishedAt).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
    : new Date().toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  spacedCenter(`PRINTED ON ${printed.toUpperCase()}`, cap2Y, 11, 1.5, MID);

  return canvas;
};

/** PNG blob of the rendered receipt. */
export const receiptToBlob = (canvas) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("empty blob"))), "image/png", 1);
  });
