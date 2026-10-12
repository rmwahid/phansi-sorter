// Analytics wrapper tests: the tracker must stay completely silent until it is
// configured, and it must report pageviews the way a hash router needs.

import test from "node:test";
import assert from "node:assert/strict";

const metas = new Map();
const appended = [];
const calls = [];

const element = () => ({
  dataset: {},
  onload: null,
  onerror: null,
  src: "",
});

globalThis.document = {
  querySelector: (selector) => {
    const match = selector.match(/meta\[name="([^"]+)"\]/);
    if (!match) return null;
    return metas.has(match[1]) ? { content: metas.get(match[1]) } : null;
  },
  createElement: () => element(),
  head: { appendChild: (node) => appended.push(node) },
};

globalThis.window = {
  umami: {
    track: (name, data) => {
      calls.push([typeof name === "function" ? name({}) : name, data]);
    },
  },
};

const { analyticsEnabled, initAnalytics, track, trackPageview } = await import("../js/lib/analytics.js");

test("stays disabled while the meta tags are empty", () => {
  metas.clear();
  assert.equal(analyticsEnabled(), false);
  initAnalytics();
  track("sorter-start", { songs: 17 });
  trackPageview("/vote");
  assert.equal(appended.length, 0, "no script is added when unconfigured");
  assert.equal(calls.length, 0, "no event leaves the page when unconfigured");
});

test("loads the tracker once when configured", () => {
  metas.set("umami-script-url", "https://anal.example.com/script.js");
  metas.set("umami-website-id", "abc-123");
  assert.equal(analyticsEnabled(), true);

  initAnalytics();
  initAnalytics(); // second call must not add a second script
  assert.equal(appended.length, 1);
  assert.equal(appended[0].src, "https://anal.example.com/script.js");
  assert.equal(appended[0].dataset.websiteId, "abc-123");
  assert.equal(appended[0].dataset.autoTrack, "false");
});

test("sends custom events and hash pageviews", () => {
  calls.length = 0;
  track("sorter-finished", { total: 17, filter: "All songs" });
  trackPageview("/result");

  assert.deepEqual(calls[0], ["sorter-finished", { total: 17, filter: "All songs" }]);
  // Pageviews are sent as a function so umami can merge in its own props.
  assert.deepEqual(calls[1][0], { url: "/result" }, "pageviews pass umami a function that adds the url");
});

test("queues events fired before the tracker is ready", async () => {
  // Fresh module state: import a copy with its own queue.
  const fresh = await import(`../js/lib/analytics.js?queued=${Date.now()}`);
  metas.set("umami-script-url", "https://anal.example.com/script.js");
  metas.set("umami-website-id", "abc-123");
  delete globalThis.window.umami;

  calls.length = 0;
  fresh.track("sorter-start", { songs: 5 });
  assert.equal(calls.length, 0, "nothing is sent while the tracker is missing");

  fresh.initAnalytics();
  const script = appended[appended.length - 1];
  globalThis.window.umami = { track: (name, data) => calls.push([typeof name === "function" ? name({}) : name, data]) };
  script.onload();
  assert.deepEqual(calls[0], ["sorter-start", { songs: 5 }], "queued event flushes on load");
});
