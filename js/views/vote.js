// Vote screen: answer "which of these two songs do you like more?" until the
// merge sort has produced a full ranking.
//
// The engine replays stored decisions silently, so a resumed run continues
// exactly where it stopped and only unseen pairs are asked again.

import { h } from "../lib/dom.js";
import { songsById, songReading } from "../data/songs.js";
import { estimateTotalComparisons, runResumableSort } from "../lib/engine.js";
import { loadSession, saveSession } from "../lib/store.js";
import { track } from "../lib/analytics.js";
import { butterfly, songLinks, spotifyPlayer, butterflyRow } from "./common.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Same shape the reference sorter sends: the filter, how many songs were ranked
 * and the ten best / ten worst readings, so the finished sorts can be compared
 * in the analytics dashboard.
 */
const trackFinished = (sortedIds, filterLabel) => {
  const data = { total: sortedIds.length, filter: filterLabel || "All songs" };
  const topCount = Math.min(10, sortedIds.length);
  const bottomCount = sortedIds.length > 10 ? Math.min(10, sortedIds.length - 10) : 0;
  for (let i = 0; i < topCount; i += 1) {
    data[`top_${i + 1}`] = songsById.get(sortedIds[i])?.romaji || sortedIds[i];
  }
  for (let i = 0; i < bottomCount; i += 1) {
    const id = sortedIds[sortedIds.length - 1 - i];
    data[`bottom_${i + 1}`] = songsById.get(id)?.romaji || id;
  }
  track("sorter-finished", data);
};

export const renderVote = (root, { navigate }) => {
  const session = loadSession();

  if (!session) {
    navigate("menu", { replace: true });
    return undefined;
  }
  if (session.status === "done") {
    navigate("result", { replace: true });
    return undefined;
  }

  const decisions = { ...session.decisions };
  let resolveChoice = null;
  let currentPair = null;
  let started = false;
  let cancelled = false;

  const total = session.totalComparisons || estimateTotalComparisons(session.songIds.length);

  const progressFill = h("div", { class: "progress__fill", style: "width:0%" });
  const progressLabel = h("p", { class: "progress__label" }, `0% · 0 of ${total} comparisons answered`);
  const pairHost = h("div", { class: "vote-grid" });
  const dockHost = h("div", { class: "dock__inner dock__inner--vote" });
  const loaderHost = h("div", { class: "center" });

  const updateProgress = () => {
    const resolved = Object.keys(decisions).length;
    const pct = total > 0 ? Math.min(100, Math.round((resolved / total) * 100)) : 0;
    progressFill.style.width = `${pct}%`;
    progressLabel.textContent = `${pct}% · ${resolved} of ${total} comparisons answered`;
  };

  const choose = (songId) => {
    if (!resolveChoice) return;
    const resolve = resolveChoice;
    resolveChoice = null;
    resolve(songId);
  };

  const renderPair = (aId, bId) => {
    currentPair = [aId, bId];
    pairHost.textContent = "";
    dockHost.textContent = "";

    const sides = [aId, bId];
    for (const [index, id] of sides.entries()) {
      const song = songsById.get(id);
      const label = index === 0 ? "A" : "B";

      pairHost.appendChild(
        h(
          "article",
          { class: "song-card" },
          h(
            "header",
            { class: "song-card__head" },
            butterfly("song-card__butterfly"),
            h("span", { class: "song-card__side" }, `${label} ·`),
            h(
              "span",
              {},
              h("span", { class: "song-card__title" }, song.japanese),
              h(
                "span",
                { class: "song-card__sub", style: "display:block" },
                songReading(song)
              )
            )
          ),
          spotifyPlayer(song),
          songLinks(song)
        )
      );

      dockHost.appendChild(
        h(
          "button",
          {
            type: "button",
            class: "btn btn--primary btn--big btn--block",
            onclick: () => choose(id),
          },
          h("span", { class: "dock__letter" }, label)
        )
      );
    }
  };

  const run = async ({ fresh }) => {
    if (started) return;
    started = true;

    track("sorter-start", {
      songs: session.songIds.length,
      filter: session.filterLabel || "All songs",
      resumed: !fresh,
      answered: session.resolvedComparisons || 0,
    });

    if (fresh) {
      loaderHost.appendChild(
        h(
          "div",
          { class: "stack" },
          butterfly("intro__butterfly"),
          h("p", { class: "muted" }, "PREPARING YOUR SORTER", h("span", { class: "blink" }, " _"))
        )
      );
      dockHost.appendChild(h("p", { class: "dock__info" }, "do not close this tab"));
      await delay(2400);
      if (cancelled) return;
      loaderHost.textContent = "";
      dockHost.textContent = "";
    }

    try {
      const { sorted } = await runResumableSort({
        items: session.songIds,
        decisions,
        ask: (a, b) =>
          new Promise((resolve) => {
            resolveChoice = resolve;
            renderPair(a, b);
            updateProgress();
          }),
        onNewDecision: () => {
          const resolved = Object.keys(decisions).length;
          updateProgress();
          saveSession({ ...session, decisions, resolvedComparisons: resolved });
        },
      });

      if (cancelled) return;

      trackFinished(sorted, session.filterLabel);
      saveSession({
        ...session,
        status: "done",
        decisions: {},
        resolvedComparisons: Object.keys(decisions).length,
        orderedResult: sorted,
        finishedAt: new Date().toISOString(),
      });
      navigate("result", { replace: true });
    } catch (error) {
      console.error("sorter failed", error);
      if (!cancelled) navigate("menu", { replace: true });
    }
  };

  const onKeyDown = (event) => {
    if (!resolveChoice || !currentPair) return;
    const key = event.key.toLowerCase();
    if (key === "a") {
      event.preventDefault();
      choose(currentPair[0]);
    } else if (key === "b") {
      event.preventDefault();
      choose(currentPair[1]);
    }
  };

  root.appendChild(
    h(
      "div",
      { class: "shell" },
      h(
        "div",
        { class: "page-title" },
        h("span", { class: "page-title__kicker" }, "step 2 of 2"),
        h("span", { class: "page-title__main" }, "Which one?"),
        h("span", { class: "page-title__sub" }, "press A or B, or use the buttons below"),
        h("span", { class: "page-title__butterflies" }, butterflyRow(3))
      ),
      h(
        "div",
        { class: "panel" },
        h(
          "div",
          { class: "panel__body" },
          h("div", { class: "progress" }, progressFill),
          progressLabel
        )
      ),
      loaderHost,
      pairHost
    )
  );

  root.appendChild(h("div", { class: "dock" }, dockHost));

  window.addEventListener("keydown", onKeyDown);
  updateProgress();
  run({ fresh: session.resolvedComparisons === 0 });

  return () => {
    cancelled = true;
    window.removeEventListener("keydown", onKeyDown);
  };
};
