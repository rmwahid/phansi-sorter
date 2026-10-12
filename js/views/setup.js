// Setup screen: choose which songs enter the vote.
//
// Two filter dimensions, like the reference sorter: a type switch selects every
// song of that type, and each year section can be opened to toggle single songs.
// Switch states are always derived from the song selection (see store.js), so
// the panel never claims something the selection does not contain.

import { h, glyph, switchEl } from "../lib/dom.js";
import { songs, yearGroups, songsOfYear, filterLabel, songReading } from "../data/songs.js";
import {
  activeSongIds,
  createSession,
  defaultDraftState,
  loadDraft,
  loadSession,
  saveDraft,
  saveSession,
  syncGroupSwitches,
} from "../lib/store.js";
import { butterflyRow, notice, panel } from "./common.js";

const MIN_SONGS = 3;

const songsWord = (count) => `${count} ${count === 1 ? "song" : "songs"}`;

export const renderSetup = (root, { navigate }) => {
  const draft = syncGroupSwitches(loadDraft() || defaultDraftState());
  const expanded = {};
  let problem = "";

  const shell = h("div", { class: "shell" });
  const dynamic = h("div", {});
  const dockInfo = h("span", { class: "dock__info" });
  const startBtn = h(
    "button",
    { type: "button", class: "btn btn--primary btn--big", onclick: () => start() },
    "START"
  );

  const persist = () => {
    saveDraft(draft);
    const y = window.scrollY;
    build();
    window.scrollTo(0, y);
  };

  const setSongs = (predicate, value) => {
    for (const song of songs) {
      if (predicate(song)) draft.songActive[song.id] = value;
    }
    Object.assign(draft, syncGroupSwitches(draft));
    persist();
  };

  const toggleSong = (song) => {
    draft.songActive[song.id] = !draft.songActive[song.id];
    Object.assign(draft, syncGroupSwitches(draft));
    persist();
  };

  const start = () => {
    const ids = activeSongIds(draft);
    if (ids.length < MIN_SONGS) {
      problem = `Please select at least ${MIN_SONGS} songs.`;
      build();
      return;
    }
    const session = createSession({
      songIds: ids,
      filterLabel: filterLabel(
        new Set(Object.keys(draft.yearActive).filter((key) => draft.yearActive[key]))
      ),
    });
    saveSession(session);
    navigate("vote");
  };

  const switchRow = (title, checked, onChange, note) =>
    h(
      "div",
      { class: "row" },
      h(
        "span",
        { class: "row__main" },
        h("span", { class: "row__title" }, title),
        note ? h("span", { class: "row__meta", style: "display:block" }, note) : null
      ),
      switchEl({ checked, label: title, onChange })
    );

  const build = () => {
    const ids = activeSongIds(draft);
    const unfinished = loadSession();

    const allRow = switchRow(
      "All songs",
      Boolean(draft.allActive),
      (value) => setSongs(() => true, value),
      `every released song · ${songsWord(songs.length)}`
    );

    const sections = yearGroups.map((group) => {
      const groupSongs = songsOfYear(group.key);
      const selected = groupSongs.filter((song) => draft.songActive[song.id]).length;
      const isOpen = Boolean(expanded[group.key]);
      const badgeTone = selected === 0 ? "badge--muted" : "";

      return h(
        "section",
        { class: "panel" },
        h(
          "div",
          { class: "row" },
          h(
            "button",
            {
              type: "button",
              class: "row--action",
              style: "border-bottom:0;padding:6px 0",
              "aria-expanded": String(isOpen),
              onclick: () => {
                expanded[group.key] = !isOpen;
                build();
              },
            },
            h(
              "span",
              { class: "row__main" },
              h("span", { class: "row__title" }, group.title),
              h(
                "span",
                { class: "row__meta", style: "display:block" },
                selected === 0 ? "no songs included" : `${selected} of ${groupSongs.length} songs included`
              )
            ),
            h("span", { class: `badge ${badgeTone}` }, `${selected}/${groupSongs.length}`),
            glyph("arrow", isOpen ? "glyph--dim" : "glyph--dim")
          ),
          switchEl({
            checked: draft.yearActive[group.key],
            label: group.title,
            onChange: (value) => setSongs(group.match, value),
          })
        ),
        isOpen
          ? h(
              "div",
              { class: "panel__body", style: "padding-top:0" },
              h(
                "div",
                { class: "stack-sm" },
                ...groupSongs.map((song) =>
                  h(
                    "button",
                    {
                      type: "button",
                      class: "song-check",
                      "aria-pressed": String(Boolean(draft.songActive[song.id])),
                      onclick: () => toggleSong(song),
                    },
                    h("span", { class: "song-check__mark" }, draft.songActive[song.id] ? "×" : ""),
                    h(
                      "span",
                      { class: "song-check__text" },
                      h("span", { class: "song-check__ja" }, song.japanese),
                      h("span", { class: "song-check__en" }, songReading(song))
                    )
                  )
                )
              )
            )
          : null
      );
    });

    dynamic.textContent = "";
    dynamic.appendChild(
      notice(
        "Every song is included by default. Open a year to leave songs out, " +
          "or use the switches to include a whole group at once."
      )
    );
    dynamic.appendChild(panel("Filter by year", h("div", {}, allRow)));
    dynamic.append(...sections);
    if (unfinished && unfinished.status === "voting") {
      dynamic.appendChild(
        notice("A sorter is still in progress. Starting a new one replaces it.", "info")
      );
    }
    if (problem) dynamic.appendChild(notice(problem));

    dockInfo.textContent = "";
    dockInfo.appendChild(h("span", { class: "dock__count" }, String(ids.length)));
    dockInfo.appendChild(document.createTextNode(` ${ids.length === 1 ? "song" : "songs"} selected · needs ${MIN_SONGS} or more`));
    startBtn.disabled = ids.length < MIN_SONGS;
  };

  shell.appendChild(
      h(
        "div",
        { class: "page-title" },
        h("span", { class: "page-title__kicker" }, "step 1 of 2"),
        h("span", { class: "page-title__main" }, "Build the list"),
        h("span", { class: "page-title__sub" }, "pick the songs that join the vote"),
        h("span", { class: "page-title__butterflies" }, butterflyRow(3))
      )
  );
  shell.appendChild(dynamic);
  root.appendChild(shell);

  root.appendChild(
    h(
      "div",
      { class: "dock" },
      h(
        "div",
        { class: "dock__inner" },
        dockInfo,
        h(
          "button",
          { type: "button", class: "btn btn--ghost", onclick: () => navigate("menu") },
          "← BACK"
        ),
        startBtn
      )
    )
  );

  build();
};
