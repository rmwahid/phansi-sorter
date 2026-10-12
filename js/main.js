// App shell: page mode (red / black), entry gate and the hash router.

import { h, mount } from "./lib/dom.js";
import { initAnalytics, track, trackPageview } from "./lib/analytics.js";
import { butterflyRow, floatingButterflies } from "./views/common.js";
import { renderMenu } from "./views/menu.js";
import { renderSetup } from "./views/setup.js";
import { renderVote } from "./views/vote.js";
import { renderResult } from "./views/result.js";

const MODE_KEY = "phansiMode";
const GATE_KEY = "phansiGate";

/* ---------------------------------------------------------------------- mode */

const readMode = () => (sessionStorage.getItem(MODE_KEY) === "black" ? "black" : "red");

const applyMode = (mode) => {
  document.body.classList.toggle("mode-black", mode === "black");
  document.body.classList.toggle("mode-red", mode !== "black");
  sessionStorage.setItem(MODE_KEY, mode);
  for (const dot of document.querySelectorAll(".mode-dot")) {
    dot.setAttribute("aria-pressed", String(dot.dataset.mode === mode));
  }
};

/* --------------------------------------------------------------------- gate */

const setupGate = () => {
  const intro = document.getElementById("intro");
  const app = document.getElementById("app");

  const enter = () => {
    sessionStorage.setItem(GATE_KEY, "yes");
    intro.hidden = true;
    app.hidden = false;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  if (sessionStorage.getItem(GATE_KEY) === "yes") {
    intro.hidden = true;
    app.hidden = false;
    return;
  }

  intro.hidden = false;
  app.hidden = true;

  mount(
    document.getElementById("intro-slot"),
    h("img", {
      class: "intro__logo-mark",
      src: "assets/logo/phantomsiita-wordmark.svg",
      alt: "Phantom Siita",
    }),
    h("p", { class: "intro__tool" }, "song sorter"),
    h("p", { class: "intro__question" }, "Are you a Phantom Siita friend?"),
    h("span", { class: "intro__butterflies" }, butterflyRow(3)),
    h(
      "div",
      { class: "intro__actions" },
      h("button", { type: "button", class: "btn btn--primary btn--big", onclick: enter }, "YES"),
      h(
        "button",
        {
          type: "button",
          class: "btn btn--ghost",
          onclick: () => window.open("https://phantomsiita.com/", "_blank", "noopener"),
        },
        "who?"
      )
    )
  );
};

/* ------------------------------------------------------------------- router */

const views = {
  menu: renderMenu,
  setup: renderSetup,
  vote: renderVote,
  result: renderResult,
};

let cleanup = null;

const currentName = () => {
  const hash = location.hash.replace(/^#\/?/, "");
  return Object.prototype.hasOwnProperty.call(views, hash) ? hash : "menu";
};

const go = (name, { replace = false } = {}) => {
  const hash = name === "menu" ? "#/" : `#/${name}`;
  if (replace) {
    history.replaceState(null, "", hash);
    route();
  } else if (location.hash === hash) {
    route();
  } else {
    location.hash = hash;
  }
};

const route = () => {
  const name = currentName();
  const view = document.getElementById("view");
  if (cleanup) {
    try {
      cleanup();
    } catch (error) {
      console.error("view cleanup failed", error);
    }
    cleanup = null;
  }
  view.textContent = "";
  const result = views[name](view, { navigate: go, mode: readMode() });
  cleanup = typeof result === "function" ? result : null;
  // Butterflies drifting along the edges, refreshed on every visit.
  view.appendChild(floatingButterflies(name === "vote" ? 2 : 4));
  window.scrollTo(0, 0);
  trackPageview(location.hash.replace(/^#/, "") || "/");
};

/* -------------------------------------------------------------------- shell */

const setupShell = () => {
  for (const dot of document.querySelectorAll(".mode-dot")) {
    dot.addEventListener("click", () => {
      applyMode(dot.dataset.mode);
      track("mode-change", { mode: dot.dataset.mode });
    });
  }
};

/* ---------------------------------------------------------------------- boot */

setupShell();
applyMode(readMode());
setupGate();
initAnalytics();
window.addEventListener("hashchange", route);
route();
