// Store tests: session and draft persistence, including the sanitising that
// keeps a stale browser storage from breaking the app.

import test from "node:test";
import assert from "node:assert/strict";

// Minimal localStorage so the module can run under node.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
};

const {
  activeSongIds,
  createSession,
  defaultDraftState,
  loadDraft,
  loadSession,
  saveDraft,
  saveSession,
  clearSession,
  syncGroupSwitches,
} = await import("../js/lib/store.js");
const { songs } = await import("../js/data/songs.js");

const reset = () => {
  store.clear();
  clearSession();
};

test("default draft includes every song", () => {
  reset();
  const draft = defaultDraftState();
  assert.equal(activeSongIds(draft).length, songs.length);
  assert.equal(draft.songActive[songs[0].id], true);
});

test("draft survives a round trip and ignores unknown ids", () => {
  reset();
  const draft = defaultDraftState();
  draft.songActive[songs[0].id] = false;
  saveDraft(draft);

  const loaded = loadDraft();
  assert.equal(loaded.songActive[songs[0].id], false);
  assert.equal(loaded.songActive[songs[1].id], true);

  // Unknown ids in storage are not copied over the default selection.
  localStorage.setItem(
    "phansiSorterDraft_v1",
    JSON.stringify({ v: 1, songActive: { ghost: true }, yearActive: {}, typeActive: { album: false } })
  );
  const patched = loadDraft();
  assert.equal(Object.keys(patched.songActive).length, songs.length);
  assert.equal(patched.songActive.ghost, undefined);
});

test("group switches are derived from the song selection", () => {
  reset();
  const draft = syncGroupSwitches(defaultDraftState());
  assert.equal(draft.yearActive["2024"], true);
  assert.equal(draft.allActive, true);

  const withoutOne = structuredClone(draft);
  const first2024 = songs.find((song) => song.released.startsWith("2024"));
  withoutOne.songActive[first2024.id] = false;
  const synced = syncGroupSwitches(withoutOne);
  assert.equal(synced.yearActive["2024"], false, "year switch turns off when a song is out");
  assert.equal(synced.allActive, false, "the all switch turns off too");
});

test("a session round trips and keeps its answer count", () => {
  reset();
  const ids = songs.slice(0, 5).map((song) => song.id);
  const session = saveSession(createSession({ songIds: ids, filterLabel: "test" }));

  const loaded = loadSession();
  assert.deepEqual(loaded.songIds, ids);
  assert.equal(loaded.status, "voting");
  assert.equal(loaded.totalComparisons, session.totalComparisons);
  assert.equal(loaded.resolvedComparisons, 0);
});

test("stale ids and winners are dropped on load", () => {
  reset();
  const ids = songs.slice(0, 4).map((song) => song.id);
  saveSession({
    ...createSession({ songIds: [...ids, "deleted-song"], filterLabel: "x" }),
    decisions: { [ids[0] + "|" + ids[1]]: ids[0], "ghost|pair": "ghost", "p|q": ids[1] },
  });

  const loaded = loadSession();
  assert.deepEqual(loaded.songIds, ids);
  assert.deepEqual(Object.keys(loaded.decisions), [ids[0] + "|" + ids[1]]);
  assert.equal(loaded.resolvedComparisons, 1);
});

test("a session with too few known songs is treated as absent", () => {
  reset();
  saveSession(createSession({ songIds: ["gone-1", "gone-2"], filterLabel: "x" }));
  assert.equal(loadSession(), null);
});

test("a finished session keeps its counter and ranking", () => {
  reset();
  const ids = songs.slice(0, 3).map((song) => song.id);
  saveSession({
    ...createSession({ songIds: ids, filterLabel: "x" }),
    status: "done",
    decisions: {},
    resolvedComparisons: 3,
    orderedResult: [...ids].reverse(),
  });

  const loaded = loadSession();
  assert.equal(loaded.status, "done");
  assert.equal(loaded.resolvedComparisons, 3);
  assert.deepEqual(loaded.orderedResult, [...ids].reverse());
});

test("a corrupt payload does not throw", () => {
  reset();
  localStorage.setItem("phansiSorterSession_v1", "{not json");
  assert.equal(loadSession(), null);
  localStorage.setItem("phansiSorterDraft_v1", "[]");
  assert.equal(loadDraft(), null);
});
