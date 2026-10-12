// Shared building blocks for the views: panels, dark dialog boxes and the
// Spotify preview player used by the vote screen.

import { h, brandMark, glyph, ornamentRow } from "../lib/dom.js";
import { spotifyEmbedUrl, spotifyTrackUrl } from "../data/songs.js";

/** Paper panel with butterfly-ornamented title bar. The two official wing
 *  designs alternate so both appear without the layout shuffling per render. */
export const panel = (title, ...body) =>
  h(
    "section",
    { class: "panel" },
    h(
      "h2",
      { class: "panel__title" },
      butterflyRow(),
      h("span", {}, title),
      butterflyRow()
    ),
    h("div", { class: "panel__body" }, ...body)
  );

/** Alternating pair of official butterflies, used as a divider ornament. */
export const butterflyRow = (count = 2) =>
  ornamentRow(() => butterfly(), count);

/**
 * One official butterfly. Which of the two wing designs shows up is picked at
 * random (decoration only, nothing depends on it); both designs share the same
 * box size so a random pick never shifts the layout.
 */
export const butterfly = (extraClass = "") =>
  brandMark(Math.random() < 0.5 ? "butterfly-01" : "butterfly-02", extraClass);

/**
 * A few butterflies drifting along the page edges, like the ones fluttering
 * over the official homepage. Purely decorative and inert; the stylesheet hides
 * the layer on narrow screens where the content fills the width.
 */
export const floatingButterflies = (count = 4) => {
  const zone = h("div", { class: "flutter-zone", "aria-hidden": "true" });
  for (let i = 0; i < count; i += 1) {
    const left = i % 2 === 0;
    const mark = butterfly("flutter-zone__mark");
    mark.style.top = `${8 + Math.random() * 78}%`;
    mark.style[left ? "left" : "right"] = `${1 + Math.random() * 4}%`;
    mark.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;
    // A narrow scale band keeps the drifting size consistent while the position
    // and the wing design still change on every visit.
    mark.style.transform = `scale(${(0.8 + Math.random() * 0.6).toFixed(2)})`;
    zone.appendChild(mark);
  }
  return zone;
};

/** Dark "old OS dialog" box. */
export const windowBox = (title, ...content) =>
  h(
    "div",
    { class: "window" },
    title ? h("div", { class: "window__bar" }, h("span", {}, title), glyph("cross", "glyph--dim")) : null,
    h("div", { class: "window__text" }, ...content)
  );

/** Inline message used instead of a toast library. */
export const notice = (message, tone = "warn") =>
  h(
    "p",
    { class: `window notice notice--${tone}`, role: "status" },
    h("span", { class: "notice__mark" }, tone === "warn" ? "!" : "i"),
    message
  );

/**
 * Inline Spotify player for the A/B cards, the same preview source the
 * reference sorter used. Both sides of a comparison get their own player so the
 * visitor can listen to A and B back to back.
 */
export const spotifyPlayer = (song) => {
  if (!song.spotify) {
    return h(
      "div",
      { class: "player player--empty" },
      h("p", { class: "player__hint" }, "no preview available for this song"),
      officialLink(song)
    );
  }

  return h(
    "div",
    { class: "player" },
    h("iframe", {
      class: "player__frame",
      src: spotifyEmbedUrl(song),
      title: `${song.japanese} on Spotify`,
      loading: "lazy",
      allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
      allowfullscreen: true,
    })
  );
};

const officialLink = (song) =>
  h(
    "a",
    { class: "player__link", href: song.source, target: "_blank", rel: "noopener noreferrer" },
    "official page ↗"
  );

/** Small link row under a player: the preview source and the official page. */
export const songLinks = (song) =>
  h(
    "p",
    { class: "song-card__links" },
    song.spotify
      ? h(
          "a",
          { href: spotifyTrackUrl(song), target: "_blank", rel: "noopener noreferrer" },
          "Spotify ↗"
        )
      : null,
    song.spotify ? h("span", { class: "song-card__sep" }, "·") : null,
    h(
      "a",
      { href: song.source, target: "_blank", rel: "noopener noreferrer" },
      "official page ↗"
    )
  );
