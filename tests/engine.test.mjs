// Engine tests: sorting semantics, the progress estimate and above all the
// resume contract (an interrupted run must continue without asking a pair twice
// and must end in the same ranking).

import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateTotalComparisons,
  mergeSort,
  pairKey,
  runResumableSort,
} from "../js/lib/engine.js";
import { songs, songReading } from "../js/data/songs.js";

test("pairKey normalises both orders", () => {
  assert.equal(pairKey("b", "a"), pairKey("a", "b"));
  assert.equal(pairKey("a", "b"), "a|b");
});

test("estimateTotalComparisons matches the documented formula", () => {
  assert.equal(estimateTotalComparisons(0), 0);
  assert.equal(estimateTotalComparisons(1), 0);
  assert.equal(estimateTotalComparisons(2), 1);
  assert.equal(estimateTotalComparisons(3), 3);
  assert.equal(estimateTotalComparisons(41), 180);
  // Never below the real lower bound log2(n!).
  for (const n of [3, 5, 8, 17, 41]) {
    assert.ok(estimateTotalComparisons(n) >= Math.log2(factorial(n)), `n=${n}`);
  }
});

const factorial = (n) => (n <= 1 ? 1 : n * factorial(n - 1));

test("mergeSort sorts with an async comparator", async () => {
  const values = [5, 3, 9, 1, 7, 3, 0, 42, -1];
  const sorted = await mergeSort(values, async (a, b) => a <= b);
  assert.deepEqual(sorted, [...values].sort((a, b) => a - b));
  assert.deepEqual(values, [5, 3, 9, 1, 7, 3, 0, 42, -1], "input must stay untouched");
});

test("runResumableSort records one decision per asked pair", async () => {
  const rating = new Map(["a", "b", "c", "d"].map((id, index) => [id, index]));
  const decisions = {};
  const asked = [];

  const { sorted } = await runResumableSort({
    items: ["d", "a", "c", "b"],
    decisions,
    ask: async (a, b) => {
      asked.push(pairKey(a, b));
      return rating.get(a) < rating.get(b) ? a : b;
    },
    onNewDecision: (key) => assert.ok(key in decisions),
  });

  assert.deepEqual(sorted, ["a", "b", "c", "d"]);
  assert.equal(asked.length, Object.keys(decisions).length);
  assert.equal(new Set(asked).size, asked.length, "no pair is asked twice");
});

test("an interrupted run resumes without repeating answered pairs", async () => {
  const items = songs.map((song) => song.id);
  const rating = new Map(items.map((id, index) => [id, index]));
  const better = (a, b) => (rating.get(a) < rating.get(b) ? a : b);

  const answeredFirstRound = [];
  const decisions = {};

  // First attempt: stop as soon as ten answers have been collected.
  await assert.rejects(async () => {
    await runResumableSort({
      items,
      decisions,
      ask: async (a, b) => {
        if (answeredFirstRound.length >= 10) throw new Error("interrupted");
        answeredFirstRound.push(pairKey(a, b));
        return better(a, b);
      },
    });
  }, /interrupted/);

  assert.equal(answeredFirstRound.length, 10);
  assert.equal(Object.keys(decisions).length, 10);

  // Second attempt with the same decisions map.
  const askedSecondRound = [];
  const { sorted } = await runResumableSort({
    items,
    decisions,
    ask: async (a, b) => {
      askedSecondRound.push(pairKey(a, b));
      return better(a, b);
    },
  });

  const repeated = askedSecondRound.filter((key) => answeredFirstRound.includes(key));
  assert.deepEqual(repeated, [], "answered pairs must not be asked again");

  const expected = [...items].sort((a, b) => rating.get(a) - rating.get(b));
  assert.deepEqual(sorted, expected, "resumed run must produce the full ranking");

  const used = Object.keys(decisions).length;
  assert.ok(used <= estimateTotalComparisons(items.length), `used ${used} comparisons`);
  assert.equal(answeredFirstRound.length + askedSecondRound.length, used);
});

test("all catalogue entries are usable by the sorter", () => {
  const ids = new Set();
  for (const song of songs) {
    assert.ok(song.id && !ids.has(song.id), `duplicate or empty id: ${song.id}`);
    ids.add(song.id);
    assert.ok(song.japanese, `missing japanese title: ${song.id}`);
    assert.ok(song.romaji, `missing romaji reading: ${song.id}`);
    assert.match(song.released, /^\d{4}-\d{2}-\d{2}$/, `bad release date: ${song.id}`);
    assert.ok(["album", "single", "coupling"].includes(song.type), `bad type: ${song.id}`);
    assert.ok(song.source.startsWith("https://phantomsiita.com/"), `bad source: ${song.id}`);
    assert.match(song.spotify, /^[A-Za-z0-9]{22}$/, `bad spotify track id: ${song.id}`);
    assert.match(song.mv, /^[A-Za-z0-9_-]{11}$/, `bad music video id: ${song.id}`);
  }
  assert.ok(songs.length >= 15, "catalogue looks too small");
  assert.equal(new Set(songs.map((song) => song.spotify)).size, songs.length, "duplicate spotify ids");
});

test("the second line never repeats the same title twice", () => {
  for (const song of songs) {
    const reading = songReading(song);
    assert.ok(reading.startsWith(song.romaji), `reading should start with the romaji: ${song.id}`);
    if (!song.english) {
      assert.equal(reading, song.romaji, `no english -> romaji only: ${song.id}`);
    }
    // "Otomodachi · Otomodachi" style repeats are dropped.
    const [left, right] = reading.split(" · ");
    if (right) {
      assert.notEqual(
        left.toLowerCase().replace(/[^a-z0-9]/g, ""),
        right.toLowerCase().replace(/[^a-z0-9]/g, ""),
        `duplicate halves in the reading: ${song.id}`
      );
    }
  }
});
