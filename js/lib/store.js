// localStorage persistence for the sorter.
//
// One active session (voting in progress or a finished ranking) survives a
// refresh so the run can be resumed instead of restarted, plus a separate draft
// for the filter toggles of the setup screen.
//
// Session shape:
// {
//   v: 1,
//   status: "voting" | "done",
//   songIds: [id...],              // frozen at creation: the sort is order dependent
//   filterLabel: "2024 · Album songs",
//   totalComparisons,              // estimate, used as the progress denominator
//   decisions: { "idA|idB": winnerId },
//   resolvedComparisons,           // === Object.keys(decisions).length
//   orderedResult: null | [id...],
//   startedAt, finishedAt, updatedAt
// }
//
// Draft shape:
// { v: 1, songActive: { id: bool }, yearActive: { key: bool } }

import { songs, songsById, yearGroups } from "../data/songs.js";
import { estimateTotalComparisons } from "./engine.js";

const SESSION_KEY = "phansiSorterSession_v1";
const DRAFT_KEY = "phansiSorterDraft_v1";

const safeParse = (raw) => {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : null;
  } catch (err) {
    return null;
  }
};

export const loadSession = () => {
  const session = safeParse(localStorage.getItem(SESSION_KEY));
  if (!session || !Array.isArray(session.songIds)) return null;

  // Drop ids that are no longer in the catalogue so a renamed song cannot
  // break the vote or the result screen.
  const songIds = session.songIds.filter((id) => songsById.has(id));
  if (songIds.length < 2) return null;

  const decisions = {};
  const raw = session.decisions && typeof session.decisions === "object" ? session.decisions : {};
  for (const [key, winner] of Object.entries(raw)) {
    // A decision is only meaningful when both sides are still in the catalogue
    // and the recorded winner is one of them.
    const [left, right] = key.split("|");
    if (!songsById.has(left) || !songsById.has(right)) continue;
    if (typeof winner === "string" && (winner === left || winner === right)) {
      decisions[key] = winner;
    }
  }

  return {
    ...session,
    songIds,
    decisions,
    // A finished session keeps its own counter: the decisions map is cleared
    // when the ranking is stored.
    resolvedComparisons:
      session.status === "done"
        ? Number(session.resolvedComparisons) || Object.keys(decisions).length
        : Object.keys(decisions).length,
    orderedResult: Array.isArray(session.orderedResult)
      ? session.orderedResult.filter((id) => songsById.has(id))
      : null,
  };
};

export const saveSession = (session) => {
  const next = { ...session, updatedAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
};

export const clearSession = () => localStorage.removeItem(SESSION_KEY);

export const createSession = ({ songIds, filterLabel }) => ({
  v: 1,
  status: "voting",
  songIds,
  filterLabel,
  totalComparisons: estimateTotalComparisons(songIds.length),
  decisions: {},
  resolvedComparisons: 0,
  orderedResult: null,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  updatedAt: new Date().toISOString(),
});

/* --------------------------------------------------------------------- draft */

export const defaultDraftState = () => ({
  songActive: Object.fromEntries(songs.map((song) => [song.id, true])),
  yearActive: Object.fromEntries(yearGroups.map((group) => [group.key, true])),
});

export const loadDraft = () => {
  const draft = safeParse(localStorage.getItem(DRAFT_KEY));
  if (!draft || typeof draft.songActive !== "object" || draft.songActive === null) return null;

  const fallback = defaultDraftState();
  const songActive = { ...fallback.songActive };
  for (const id of Object.keys(songActive)) {
    if (typeof draft.songActive[id] === "boolean") songActive[id] = draft.songActive[id];
  }

  const pick = (source, groups) => {
    const out = {};
    for (const group of groups) {
      const value = source && typeof source[group.key] === "boolean" ? source[group.key] : true;
      out[group.key] = value;
    }
    return out;
  };

  return {
    v: 1,
    songActive,
    yearActive: pick(draft.yearActive, yearGroups),
  };
};

export const saveDraft = (state) => {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      v: 1,
      songActive: state.songActive,
      yearActive: state.yearActive,
    })
  );
};

/* ------------------------------------------------------------------ helpers */

export const activeSongIds = (state) => songs.filter((song) => state.songActive[song.id]).map((song) => song.id);

const songsOf = (yearKey) => {
  const group = yearGroups.find((entry) => entry.key === yearKey);
  return group ? songs.filter(group.match) : [];
};

/** Year switches are derived: a section switch is on when every song in it is on. */
export const syncGroupSwitches = (state) => {
  const yearActive = {};
  for (const group of yearGroups) yearActive[group.key] = songsOf(group.key).every((song) => state.songActive[song.id]);
  return { ...state, yearActive, allActive: songs.every((song) => state.songActive[song.id]) };
};
