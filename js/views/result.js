// Result screen: the finished ranking, a downloadable receipt image and a
// share text for X.

import { h, glyph, formatDate } from "../lib/dom.js";
import { songsById, songReading } from "../data/songs.js";
import { clearSession, loadSession } from "../lib/store.js";
import { track } from "../lib/analytics.js";
import { receiptToBlob, renderReceipt } from "../lib/receipt.js";
import { butterflyRow, panel } from "./common.js";

const SITE = "https://phantomsiita.com/";

export const renderResult = (root, { navigate }) => {
  const session = loadSession();

  if (!session) {
    navigate("menu", { replace: true });
    return undefined;
  }
  if (session.status === "voting") {
    navigate("vote", { replace: true });
    return undefined;
  }

  const ranking = (session.orderedResult || []).map((id) => songsById.get(id)).filter(Boolean);
  let menuOpen = false;
  let saving = false;

  const dockMenu = h("div", { class: "dock-menu", hidden: true });
  const saveBtn = h(
    "button",
    { type: "button", class: "btn btn--primary dock__action", onclick: () => toggleMenu() },
    glyph("star"),
    "Save recap"
  );

  const save = async (scope) => {
    if (saving || !ranking.length) return;
    saving = true;
    menuOpen = false;
    paintDock();
    try {
      const list = scope === "top10" ? ranking.slice(0, 10) : ranking;
      const canvas = await renderReceipt(list, {
        finishedAt: session.finishedAt,
        // Printed on the receipt; taken from the page so any domain works.
        url: location.href.split("#")[0],
      });
      const blob = await receiptToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `phansi-song-ranking-${scope}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      track("receipt-saved", { scope, songs: list.length });
    } catch (error) {
      console.error("receipt failed", error);
      alert("Could not build the image. Please try again.");
    } finally {
      saving = false;
      paintDock();
    }
  };

  const shareText = () => {
    const top = ranking.slice(0, 5).map(
      (song, index) => `${index + 1}. ${song.japanese}${song.english ? ` (${song.english})` : ""}`
    );
    return [
      "My Phantom Siita song ranking:",
      ...top,
      "",
      `Ranked with the Phantom Siita Song Sorter: ${location.href.split("#")[0]}`,
    ].join("\n");
  };

  const openX = () => {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(shareText())}`;
    track("share-x", { songs: ranking.length, filter: session.filterLabel || "All songs" });
    window.open(url, "_blank", "noopener");
  };

  function toggleMenu() {
    menuOpen = !menuOpen;
    paintDock();
  }

  function paintDock() {
    saveBtn.textContent = "";
    saveBtn.append(glyph("star"), saving ? "Generating image..." : "Save recap");
    saveBtn.disabled = saving;

    dockMenu.hidden = !menuOpen;
    dockMenu.textContent = "";
    if (!menuOpen) return;

    const options = [];
    if (ranking.length > 10) {
      options.push({ scope: "top10", title: "Top 10", desc: "The ten songs at the top", badge: "10 songs" });
    }
    options.push({
      scope: "full",
      title: "Full ranking",
      desc: "Every song in order",
      badge: `${ranking.length} songs`,
    });

    for (const option of options) {
      dockMenu.appendChild(
        h(
          "button",
          { type: "button", class: "row--action", onclick: () => save(option.scope) },
          glyph("star", "glyph--lg"),
          h(
            "span",
            { class: "row__main" },
            h("span", { class: "row__title" }, option.title),
            h("span", { class: "row__meta", style: "display:block" }, option.desc)
          ),
          h("span", { class: "badge" }, option.badge)
        )
      );
    }
  }

  const rows = ranking.map((song, index) =>
    h(
      "li",
      { class: `rank-row rank-row--${index + 1}` },
      h("span", { class: "rank-row__no" }, String(index + 1)),
      h(
        "span",
        { class: "row__main" },
        h("span", { class: "rank-row__title" }, song.japanese),
        h(
          "span",
          { class: "rank-row__meta", style: "display:block" },
          songReading(song)
        )
      ),
      song.mv
        ? h(
            "a",
            {
              class: "rank-row__link",
              href: song.source,
              target: "_blank",
              rel: "noopener noreferrer",
            },
            "official ↗"
          )
        : null
    )
  );

  root.appendChild(
    h(
      "div",
      { class: "shell" },
      h(
        "div",
        { class: "page-title" },
        h("span", { class: "page-title__kicker" }, "your ranking"),
        h("span", { class: "page-title__main" }, `${ranking.length} songs`),
        h(
          "span",
          { class: "page-title__sub" },
          `${session.filterLabel || "All songs"} · finished ${formatDate(session.finishedAt ? session.finishedAt.slice(0, 10) : "")}`
        ),
        h("span", { class: "page-title__butterflies" }, butterflyRow(3))
      ),
      panel("Ranking", h("ol", { class: "rank-list" }, ...rows)),
      h(
        "div",
        { class: "center stack" },
        h(
          "button",
          {
            type: "button",
            class: "btn",
            onclick: () => {
              clearSession();
              navigate("setup");
            },
          },
          "New sorter"
        ),
        h(
          "p",
          { class: "muted" },
          "The list is stored in this browser only. Starting a new sorter clears it."
        )
      ),
      h("hr", { class: "lace-edge" })
    )
  );

  root.appendChild(
    h(
      "div",
      { class: "dock" },
      dockMenu,
      h(
        "div",
        { class: "dock__inner" },
        h(
          "span",
          { class: "dock__info" },
          h("span", { class: "dock__count" }, String(ranking.length)),
          " songs ranked"
        ),
        saveBtn,
        h(
          "button",
          { type: "button", class: "btn btn--x", onclick: openX },
          "Share on X"
        )
      )
    )
  );

  paintDock();
  return undefined;
};
