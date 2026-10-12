// Menu screen: start a new sorter, resume a run in progress, or open the last
// finished ranking.

import { h, brandMark, glyph, formatDate } from "../lib/dom.js";
import { songs, songsById } from "../data/songs.js";
import { loadDraft, loadSession } from "../lib/store.js";
import { panel, windowBox } from "./common.js";

export const renderMenu = (root, { navigate }) => {
  const session = loadSession();
  const draft = loadDraft();
  const draftCount = draft
    ? songs.filter((song) => draft.songActive[song.id]).length
    : songs.length;

  const hasVoting = session && session.status === "voting";
  const hasResult =
    session && session.status === "done" && Array.isArray(session.orderedResult) && session.orderedResult.length > 0;

  const progressPct =
    session && session.totalComparisons > 0
      ? Math.min(100, Math.round((session.resolvedComparisons / session.totalComparisons) * 100))
      : 0;

  const actionRow = (icon, title, desc, right, onClick) =>
    h(
      "button",
      { class: "row--action", type: "button", onclick: onClick },
      icon,
      h(
        "span",
        { class: "row__main" },
        h("span", { class: "row__title" }, title),
        h("span", { class: "row__meta", style: "display:block" }, desc)
      ),
      right
    );

  const rows = [
    actionRow(
      glyph("star", "glyph--lg"),
      "Start a new sorter",
      "Pick the songs, then rank them two at a time.",
      h("span", { class: "badge" }, `${draftCount} songs`),
      () => navigate("setup")
    ),
  ];

  if (hasVoting) {
    rows.push(
      actionRow(
        glyph("arrow", "glyph--lg"),
        "Resume current sorter",
        `${session.resolvedComparisons} of ${session.totalComparisons} comparisons answered`,
        h("span", { class: "row__value" }, `${progressPct}%`),
        () => navigate("vote")
      )
    );
  }

  if (hasResult) {
    const top = session.orderedResult
      .slice(0, 3)
      .map((id) => songsById.get(id))
      .filter(Boolean);
    rows.push(
      actionRow(
        brandMark("butterfly-01", "mark--lead"),
        "Last result",
        `${session.orderedResult.length} songs ranked · ${session.filterLabel} · ${formatDate(session.finishedAt)}`,
        null,
        () => navigate("result")
      )
    );
    rows.push(
      h(
        "div",
        { class: "panel__note" },
        h("div", { class: "stack-sm" }, ...top.map((song, index) =>
          h(
            "div",
            { class: "rank-row" },
            h("span", { class: `rank-row__no rank-row__no--${index + 1}` }, `${index + 1}`),
            h(
              "span",
              { class: "row__main" },
              h("span", { class: "rank-row__title" }, song.japanese),
              h("span", { class: "rank-row__meta", style: "display:block" }, song.english || song.origin)
            )
          )
        ))
      )
    );
  }

  root.appendChild(
    h(
      "div",
      { class: "shell" },
      h(
        "div",
        { class: "page-title" },
        h("span", { class: "page-title__kicker" }, "song sorter"),
        h("img", {
          class: "page-title__logo",
          src: "assets/logo/phantomsiita-wordmark.svg",
          alt: "Phantom Siita",
        }),
        h("span", { class: "page-title__sub" }, "rank the discography by taste")
      ),
      panel("Menu", h("div", {}, ...rows)),
      windowBox(
        "how it works",
        h(
          "p",
          {},
          "The sorter asks one question at a time: which of these two songs do you like more? ",
          "Every answer is stored in this browser, so you can close the tab and continue later. ",
          "A full run over all ",
          String(songs.length),
          " songs needs roughly 70 answers."
        )
      )
    )
  );
};
