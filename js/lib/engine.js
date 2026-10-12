// Song sorter engine: a resumable, pairwise comparison sort.
//
// Pure JavaScript with no DOM or storage access, so it can run (and be tested)
// outside the browser. The voter answers one comparison at a time; merge sort
// turns those answers into a full ordering in about n*log2(n) questions.
//
// Every answer is stored under a normalised pair key, which makes a run
// resumable: recorded decisions are replayed silently and only unseen pairs are
// asked again. That only holds while the input order stays the same, which is
// why a session freezes its song list at creation time.

/** Normalised key for a pair, independent of the order the two sides appear. */
export const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Upper bound of the comparisons merge sort needs for n items, used as a stable
 * progress denominator. The real count depends on the answers, so it is only
 * exact when the run finishes.
 */
export const estimateTotalComparisons = (n) =>
  n <= 1 ? 0 : Math.ceil(n * Math.log2(n)) - n + 1;

/**
 * Generic async merge sort. `shouldTakeLeft(a, b)` may be async and returns
 * true when `a` must come before `b`. Returns a sorted copy of `items`.
 */
export const mergeSort = async (items, shouldTakeLeft) => {
  if (items.length <= 1) return items.slice();

  const mid = Math.floor(items.length / 2);
  const left = await mergeSort(items.slice(0, mid), shouldTakeLeft);
  const right = await mergeSort(items.slice(mid), shouldTakeLeft);

  const merged = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (await shouldTakeLeft(left[i], right[j])) {
      merged.push(left[i]);
      i += 1;
    } else {
      merged.push(right[j]);
      j += 1;
    }
  }

  return [...merged, ...left.slice(i), ...right.slice(j)];
};

/**
 * Resumable sorter. `decisions` maps a normalised pair key to the winning id.
 * Pairs that already have a decision are resolved without asking; unanswered
 * pairs call `ask(a, b)`, which must resolve with the winning id. Each new
 * answer is reported once through `onNewDecision(key, winner)` so the caller can
 * persist it. The `decisions` object is mutated in place.
 */
export const runResumableSort = async ({ items, decisions, ask, onNewDecision }) => {
  const sorted = await mergeSort(items, async (a, b) => {
    const key = pairKey(a, b);
    let winner = decisions[key];

    if (winner === undefined) {
      winner = await ask(a, b);
      decisions[key] = winner;
      if (onNewDecision) onNewDecision(key, winner);
    }

    return winner === a;
  });

  return { sorted, decisions };
};
