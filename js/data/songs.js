// Song catalogue for the Phantom Siita song sorter.
//
// Every entry was taken from the official homepage on 2026-10-12:
//   - `japanese`  : title exactly as printed on the official discography and
//                   music video news entries
//   - `romaji`    : how the Japanese title is read. The official site does not
//                   publish readings, so these are transcriptions (kana titles
//                   are exact; kanji titles use their standard reading).
//                   `輪廻る` is the one reading that could not be checked
//                   against any official source, so treat it as a best guess.
//   - `english`   : the official English title shown on the same pages; "" when
//                   the official site has no English rendering yet. Where the
//                   official English title is just the romaji again (for
//                   example おともだち -> "Otomodachi"), the UI shows a single
//                   line instead of repeating itself.
//   - `released`  : release date (digital release date, or disc release date
//                   for the CD singles)
//   - `type`      : kept for reference only (`album`, `single`, `coupling`);
//                   the setup screen filters by year, not by type
//   - `spotify`   : Spotify track id used for the in-app A/B preview. Resolved
//                   from the label's own smart links (phantom-siita.lnk.to) and
//                   the artist's Spotify discography, then checked against
//                   Spotify's oEmbed endpoint so the title matches the song.
//                   See reference/scripts/fetch-spotify-ids.mjs.
//   - `mv`        : YouTube id of the official MUSIC VIDEO as embedded by the
//                   official site (news category 13, "VIDEO")
//   - `source`    : official page the entry was read from
//
// A song without a Spotify id would simply render without a preview player, and
// an empty `mv` hides the music video link, so new entries can be added with
// either field left blank.

export const songs = [
  {
    id: "otomodachi",
    japanese: "おともだち",
    romaji: "Otomodachi",
    english: "Otomodachi",
    released: "2024-06-26",
    type: "album",
    origin: '1st Album "Girlhood Memories"',
    spotify: "50eZvIHB0xLGufN0V6FGcF",
    mv: "jMsbCJ6NFS0",
    source: "https://phantomsiita.com/news/detail/10",
  },
  {
    id: "kimi-to-xxxx",
    japanese: "キミと✕✕✕✕したいだけ",
    romaji: "Kimi to xxxx Shitai Dake",
    english: "Just Wanna xxxx With You",
    released: "2024-07-31",
    type: "album",
    origin: '1st Album "Girlhood Memories"',
    spotify: "6laW0Ja9JaNcWWN4JoXUOU",
    mv: "wRQ7TpV0JSA",
    source: "https://phantomsiita.com/news/detail/11",
  },
  {
    id: "mashou-shoujo",
    japanese: "魔性少女",
    romaji: "Mashou Shoujo",
    english: "Devilish Girl",
    released: "2024-08-28",
    type: "album",
    origin: '1st Album "Girlhood Memories"',
    spotify: "4x262Zdd1BapEDQjx5sYZR",
    mv: "HvScug2tmfA",
    source: "https://phantomsiita.com/news/detail/12",
  },
  {
    id: "hanabami",
    japanese: "花喰み",
    romaji: "Hanabami",
    english: "Hanabami",
    released: "2024-09-27",
    type: "album",
    origin: '1st Album "Girlhood Memories"',
    spotify: "0xHOuHtImpczfMqRfxB7Wl",
    mv: "SaN-bqqMGr4",
    source: "https://phantomsiita.com/news/detail/13",
  },
  {
    id: "otome-shinjuu",
    japanese: "乙女心中",
    romaji: "Otome Shinjuu",
    english: "Conflicting",
    released: "2024-10-10",
    type: "album",
    origin: '1st Album "Girlhood Memories"',
    spotify: "3ZW4hA9dGe8nznsZx7yr4l",
    mv: "zGTIPZuaoy4",
    source: "https://phantomsiita.com/news/detail/14",
  },
  {
    id: "zokuzoku",
    japanese: "ゾクゾク",
    romaji: "Zokuzoku",
    english: "Zoku Zoku",
    released: "2024-10-25",
    type: "album",
    origin: '1st Album "Girlhood Memories"',
    spotify: "4sCIVnqa1PfLMhOebLvfae",
    mv: "H-1oG5U0NAo",
    source: "https://phantomsiita.com/news/detail/43",
  },
  {
    id: "hanagatami",
    japanese: "HANAGATAMI",
    romaji: "HANAGATAMI",
    english: "HANAGATAMI",
    released: "2024-12-26",
    type: "album",
    origin: '1st Album "Girlhood Memories"',
    spotify: "5GlPEN11q6aNd5mcGZjtsC",
    mv: "npygsyQAjNk",
    source: "https://phantomsiita.com/news/detail/75",
  },
  {
    id: "suki-kirai",
    japanese: "すき、きらい",
    romaji: "Suki, Kirai",
    english: "I Like It, I Dislike It",
    released: "2025-07-09",
    type: "single",
    origin: "Major debut single A-side",
    spotify: "20h1ZddVfHiuxWg8c2oaKO",
    mv: "YDNMQiwTQn0",
    source: "https://phantomsiita.com/news/detail/123",
  },
  {
    id: "sukkuri-san",
    japanese: "そっくりさん",
    romaji: "Sukkuri-san",
    english: "Look-alike",
    released: "2025-07-09",
    type: "coupling",
    origin: "Major debut single coupling",
    spotify: "7m3X1ixkFEyMuyj9gjHq5Y",
    mv: "1aay0FuU_98",
    source: "https://phantomsiita.com/news/detail/155",
  },
  {
    id: "noah",
    japanese: "ノア",
    romaji: "Noa",
    english: "Noah",
    released: "2025-08-25",
    type: "single",
    origin: "Digital single",
    spotify: "7kF7pw5N47UNK7RzHfuGzX",
    mv: "OY_NYjdTPhA",
    source: "https://phantomsiita.com/news/detail/188",
  },
  {
    id: "bot-bakka",
    japanese: "botばっか",
    romaji: "bot bakka",
    english: "",
    released: "2025-11-11",
    type: "single",
    origin: "Digital single",
    spotify: "24FrCLaRsEvTCA6ChTOzUg",
    mv: "tJofqLSYjM8",
    source: "https://phantomsiita.com/news/detail/226",
  },
  {
    id: "barairo-no-tsuki",
    japanese: "薔薇色の月",
    romaji: "Barairo no Tsuki",
    english: "Rose-Colored Moon",
    released: "2026-01-30",
    type: "single",
    origin: "Digital single",
    spotify: "2Diqv4GLQ8pS66JhwsTGLl",
    mv: "wg71amM8LUo",
    source: "https://phantomsiita.com/news/detail/271",
  },
  {
    id: "mou-ii-kai",
    japanese: "もーいーかい？",
    romaji: "Mou ii kai?",
    english: "Are you ready?",
    released: "2026-04-05",
    type: "single",
    origin: "Digital single",
    spotify: "1y4YfZwPYSBUIqmEGfRLCo",
    mv: "kGe-sxrAJIw",
    source: "https://phantomsiita.com/news/detail/312",
  },
  {
    id: "horror-queen",
    japanese: "ホラークイーン",
    romaji: "Horror Queen",
    english: "",
    released: "2026-06-24",
    type: "single",
    origin: "2nd CD single A-side",
    spotify: "0E01q61lKNmHmFdDMQpmUo",
    mv: "X7Ht9CULonY",
    source: "https://phantomsiita.com/news/detail/375",
  },
  {
    id: "rinneru",
    japanese: "輪廻る",
    romaji: "Rinneru",
    english: "",
    released: "2026-08-01",
    type: "single",
    origin: "Digital single",
    spotify: "5xX8gjMW8bOM2kJ8HVHkdw",
    mv: "wP3Q3gqu4j8",
    source: "https://phantomsiita.com/news/detail/427",
  },
  {
    id: "ningyohime-no-uta",
    japanese: "にんぎょひめのうた",
    romaji: "Ningyohime no Uta",
    english: "The Little Mermaid's Song",
    released: "2026-08-14",
    type: "single",
    origin: "Digital single",
    spotify: "5XQovHnyf6SCWGLXkGEPpk",
    mv: "Z-N0frXwQE4",
    source: "https://phantomsiita.com/news/detail/433",
  },
  {
    id: "sweet-pea",
    japanese: "スイートピー",
    romaji: "Sweet Pea",
    english: "Sweet Pea",
    released: "2026-10-11",
    type: "single",
    origin: "Digital single",
    spotify: "1zkbBdissNduDMERKZbbta",
    mv: "P7nWytByzug",
    source: "https://phantomsiita.com/news/detail/483",
  },
];

/** Lookup by id, built once so views do not linear-search the catalogue. */
export const songsById = new Map(songs.map((song) => [song.id, song]));

/** Spotify embed source for the A/B preview player. */
export const spotifyEmbedUrl = (song) =>
  `https://open.spotify.com/embed/track/${song.spotify}?utm_source=generator&theme=0`;

/** Public Spotify page, used as the fallback link when a preview is blocked. */
export const spotifyTrackUrl = (song) => `https://open.spotify.com/track/${song.spotify}`;

/**
 * Readable second line for a song: the romaji reading, plus the official English
 * title when it actually differs (for several songs the official English title
 * is the romaji again, and repeating it would just be noise).
 */
export const songReading = (song) => {
  const same = song.english.toLowerCase().replace(/[^a-z0-9]/g, "") ===
    song.romaji.toLowerCase().replace(/[^a-z0-9]/g, "");
  return same || !song.english ? song.romaji : `${song.romaji} · ${song.english}`;
};

/** Year groups drive the setup screen: one accordion section per year. */
export const yearGroups = [
  { key: "2024", title: "2024 · Debut era", match: (song) => song.released.startsWith("2024") },
  { key: "2025", title: "2025", match: (song) => song.released.startsWith("2025") },
  { key: "2026", title: "2026", match: (song) => song.released.startsWith("2026") },
];

export const songsOfYear = (key) => {
  const group = yearGroups.find((entry) => entry.key === key);
  return group ? songs.filter(group.match) : [];
};

/** Human readable filter label used on the result screen and in shares. */
export const filterLabel = (activeYears) => {
  const years = yearGroups.filter((group) => activeYears.has(group.key)).map((group) => group.key);
  if (years.length === 0) return "No songs";
  if (years.length === yearGroups.length) return "All songs";
  return years.join(" / ");
};
