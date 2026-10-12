# PhansiSorter

Fan-made song sorter for **Phantom Siita**: pick which songs join the vote, then
answer one "which of these two do you like more?" question at a time until the
whole discography is ranked.

Static site: plain HTML, CSS and ES modules. **No dependencies, no build step,
no backend.** Everything runs in the browser and the progress is stored in
`localStorage`, so a run can be paused and resumed.

## Run it

```bash
npm run serve          # http://127.0.0.1:4173/  (node tools/serve.mjs [port])
npm test               # 21 checks: engine, store, asset + class wiring, social preview
npm run assets         # regenerate assets/pixel from tools/gen-pixel-assets.mjs
node tools/set-og-url.mjs https://your-domain/   # before deploying, see below
```

ES modules do not load over `file://`, so use the bundled server (or any static
file server) instead of opening `index.html` directly.

## Link previews (Discord, X, Slack)

`index.html` carries Open Graph and Twitter card tags plus
`assets/social/og-card.jpg` (1200x630, ~210 KB). Crawlers refuse relative image
URLs and never run JavaScript, so the domain has to be baked in before
deploying:

```bash
node tools/set-og-url.mjs https://user.github.io/phansi-sorter/
```

That rewrites `og:image`, `twitter:image`, adds `og:url` and a canonical link.
The script is idempotent, so run it again whenever the domain changes (a
github.io project page, a workers.dev deployment or a custom domain all work the
same way). Without it, previews still show the title and description but no
image.

Regenerate the card itself with `npm run serve` and open
[tools/og-card.html](tools/og-card.html); it renders the image on a canvas and
offers it as a download. `robots.txt` is permissive, so search engines may index
the page.

## Analytics (Umami, optional)

Tracking is off until the website id is filled in. The script URL already points
at the shared Umami instance (the one the reference sorter uses); register a new
website there and paste its id:

```html
<meta name="umami-script-url" content="https://anal.bokuao-playground.com/script.js" />
<meta name="umami-website-id" content="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
```

Every website registered in that instance has its own id and its own statistics,
so the two sorters stay separate in the dashboard while sharing one tracker
host. While the id is empty nothing is loaded and no request leaves the page, so
local development stays offline. The tracker reports to the id, and the hostname
in the dashboard comes from the visiting page, so the deployment domain never
has to be known in advance. Because the app is a hash router, automatic
pageviews are switched off (`data-auto-track="false"`) and every route change is
reported by hand.

Events, following the reference sorter:

| Event | Data |
|---|---|
| pageview | hash route, e.g. `/vote` |
| `sorter-start` | `songs`, `filter`, `resumed`, `answered` |
| `sorter-finished` | `total`, `filter`, `top_1`..`top_10`, `bottom_1`..`bottom_10` (romaji readings) |
| `receipt-saved` | `scope` (top10/full), `songs` |
| `share-x` | `songs`, `filter` |
| `mode-change` | `mode` (red/black) |

## Screens

| Route | Screen | What it does |
|---|---|---|
| `#/` | Menu | Start a new sorter, resume the run in progress, reopen the last ranking |
| `#/setup` | Build the list | One switch for everything plus a per-year list; each song can be toggled |
| `#/vote` | Which one? | A/B comparison with an inline Spotify player per side, progress meter, A/B keys |
| `#/result` | Ranking | Full ranking, receipt PNG export, share text for X |

The receipt image carries the official wordmark and two butterflies (drawn onto
the canvas from `assets/logo`, tinted so they stay legible on pink paper), the
same `romaji · English` line as the app, and the address of the page it was
exported from. That address is read from `location` at export time and shrunk to
fit when it is long, so a github.io, workers.dev or custom domain all print
correctly without touching any code.

Two page modes mirror the official homepage: **red** (default) and **black**,
stored in `sessionStorage`. The first visit passes a small decorative gate.

## How the sort works

`js/lib/engine.js` is a pure, resumable merge sort:

- The voter answers pairwise comparisons; merge sort needs about `n·log2(n)`
  of them (roughly 70 answers for all 17 songs, worst case 54 for this
  catalogue).
- Every answer is stored under a normalised pair key (`min|max`) in
  `decisions`, so an interrupted run replays the recorded answers silently and
  only asks for pairs that are still unknown.
- The progress denominator is an estimate (`ceil(n·log2 n) − n + 1`), because
  the exact number of questions depends on the answers.

`js/lib/store.js` owns persistence:

- `phansiSorterSession_v1` - the active run (song list, decisions, ranking).
- `phansiSorterDraft_v1` - the setup screen selection.
- Song ids and decisions that no longer match the catalogue are dropped on
  load, so a stale browser storage can never break the app.

## Song data

`js/data/songs.js` holds the catalogue: 17 songs with the Japanese title, the
romaji reading, the official English title where the site provides one, the
release date, a Spotify track id for the preview player and the official music
video id.

The romaji reading is a transcription: the official site never publishes
readings, so kana titles are exact and kanji titles use their standard reading
(the one exception is noted in the data file). Where the official English title
is just the romaji again, the UI prints a single line instead of repeating it;
the song rows read "Japanese title" on the first line and "romaji · English
title" on the second.

All of it was read from the official homepage on **12 October 2026**
(discography, music video news entries) and each entry keeps its `source` link.
The Spotify ids were resolved from the label's own smart links
(`phantom-siita.lnk.to`, linked on the discography pages) and the artist's
Spotify discography, then checked against Spotify's oEmbed endpoint so the track
title matches the song; the pipeline is `reference/scripts/fetch-spotify-ids.mjs`.
Song titles, previews, videos and artwork remain the property of Phantom Siita /
Cloud Nine Inc.; this tool only links to them. Songs without an official English
title show the Japanese title alone, and a song without a Spotify id simply
renders without a player.

## Design

The look follows the design vocabulary of the official site: PixelMplus12
everywhere, 1px hard borders, offset hard shadows, paper panels over a red or
black page, inverse-video hovers, ◇/♡ ornaments and a dotted pattern.

Secondary text is deliberately darker than on the reference site
(`--panel-soft: #523636` on paper, `--muted-ink` on the page background), because
the original brown was too faint at 13-14px with the pixel font.

None of the official artwork is copied, with one deliberate exception: the marks in
`assets/logo/` are the real brand artwork, bundled at the project owner's request
so the header, the menu title and the entry gate can show the wordmark instead of
plain text, and the panel titles, the menu row icon and the sorter loader can show
the official butterfly instead of a placeholder shape. The two butterfly designs
alternate across the ornament rows (deterministic, so the layout does not shuffle
between renders). Provenance and rights notes live in `assets/logo/README.txt`;
removing that folder and the usages listed there returns the app to text titles
and generated sprites. Everything else in `assets/pixel` is generated from
hand-written bitmap strings by `tools/gen-pixel-assets.mjs` (including the PNG
cursor, written with `node:zlib`), and the font is the freely licensed PixelMplus12
(see `assets/fonts/M-PLUS-FONT-LICENSE.txt`, which grants unlimited use, copy and
distribution, commercial included). The browser tab icon is
`assets/pixel/heart.svg` and is meant to stay that way.

Background reading for the theme lives in the parent folder:
`../reference/phantomsiita/README.md` (palette, typography, component recipes)
and `../reference/song-sorter-flow.md` (the sorter flow this one follows).

## Layout of the code

```
index.html                  shell: header, view container, entry gate
css/style.css               design tokens, components, two page modes
js/main.js                  mode handling, gate, hash router
js/data/songs.js            catalogue + filter groups
js/lib/engine.js            resumable pairwise merge sort (pure)
js/lib/store.js             localStorage session and draft
js/lib/receipt.js           canvas receipt renderer
js/lib/dom.js               hyperscript helpers, switches, date/format helpers
js/views/menu.js            menu screen
js/views/setup.js           song selection
js/views/vote.js            comparison loop
js/views/result.js          ranking, export, share
js/views/common.js          panels, dialog boxes, Spotify player
assets/logo/                official wordmark + its provenance note
assets/pixel/               generated sprites (tools/gen-pixel-assets.mjs)
assets/fonts/               PixelMplus12 + its licence
tools/gen-pixel-assets.mjs  sprite generator (SVG + PNG)
tools/serve.mjs             dependency free static server
tools/og-card.html          renders assets/social/og-card.jpg
tools/set-og-url.mjs        bakes the deployment domain into the OG tags
tests/                      node:test suites
```

## Known environment note

Preview playback depends on the visitor's browser and network. The Spotify
embeds render in the automated browser used during development, while third
party YouTube embeds were blocked there ("This video is unavailable") even though
the videos exist. Every id in the catalogue, Spotify and YouTube, is verified
against the provider's oEmbed endpoint by
`node ../reference/scripts/check-embeds.mjs`, and each card keeps plain "Spotify"
and "official page" links as a fallback.
