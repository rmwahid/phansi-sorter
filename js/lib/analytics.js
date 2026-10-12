// Analytics (Umami), configured from <meta> tags in index.html.
//
// Nothing is loaded and nothing is sent until both tags are filled in, so local
// development stays completely offline. Fill them once for the deployment:
//
//   <meta name="umami-script-url" content="https://anal.example.com/script.js" />
//   <meta name="umami-website-id" content="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
//
// The script URL is absolute, so the domain the app is served from does not have
// to be known in advance: Umami records the visiting hostname itself. The app
// uses a hash router, so automatic pageview tracking is switched off
// (`data-auto-track="false"`) and every route change is reported by hand, the
// same way the reference sorter does it.
//
// Events sent: sorter-start, sorter-finished, receipt-saved, share-x,
// mode-change (pageviews go through umami's own pageview call).

const scriptUrl = () =>
  document.querySelector('meta[name="umami-script-url"]')?.content?.trim() || "";
const websiteId = () =>
  document.querySelector('meta[name="umami-website-id"]')?.content?.trim() || "";

const enabled = () => Boolean(scriptUrl() && websiteId());

const queue = [];
let started = false;

const call = (name, data) => {
  if (typeof window.umami?.track !== "function") return false;
  if (typeof name === "function") window.umami.track(name);
  else window.umami.track(name, data);
  return true;
};

const flush = () => {
  while (queue.length) {
    const [name, data] = queue.shift();
    if (!call(name, data)) return; // put it back on the next flush
  }
};

/** Load the tracker once, if it is configured. Safe to call on every boot. */
export const initAnalytics = () => {
  if (started || !enabled()) return;
  started = true;

  const script = document.createElement("script");
  script.defer = true;
  script.src = scriptUrl();
  script.dataset.websiteId = websiteId();
  // Hash routes are invisible to automatic tracking, so they are sent manually.
  script.dataset.autoTrack = "false";
  script.onload = flush;
  script.onerror = () => {
    // A blocked or unreachable tracker must never affect the sorter.
    started = false;
    queue.length = 0;
  };
  document.head.appendChild(script);
};

/** Custom event. Queued until the tracker is ready, dropped when disabled. */
export const track = (name, data) => {
  if (!enabled()) return;
  if (call(name, data)) return;
  queue.push([name, data]);
  if (queue.length > 40) queue.shift();
};

/** Pageview for the current hash route, reported like the reference sorter. */
export const trackPageview = (path) => {
  if (!enabled()) return;
  if (call((props) => ({ ...props, url: path }))) return;
  queue.push([(props) => ({ ...props, url: path })]);
  if (queue.length > 40) queue.shift();
};

export const analyticsEnabled = enabled;
