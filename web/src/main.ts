import "./styles.css";
import { unzipSync } from "fflate";
import { openDB } from "idb";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type LangCode = "pl" | "en" | "de" | "fr" | "es" | "it" | "pt" | "nl" | "ru";

type LangSegment = { start: number; end: number; lang: LangCode };

type StoredBook = {
  id: string;
  name: string;
  format: "EPUB" | "PDF";
  title: string;
  author: string;
  text: string;
  language: LangCode;
  segments: LangSegment[];
  position: number;
  importedAt: number;
};

const dbPromise = openDB("audiobook-reader", 1, {
  upgrade(db) {
    db.createObjectStore("books", { keyPath: "id" });
  }
});

const app = document.querySelector<HTMLDivElement>("#app")!;
let current: StoredBook | null = null;
let speaking = false;
let voices: SpeechSynthesisVoice[] = [];
let selectedVoiceURI: string = localStorage.getItem("voiceSelection") || "auto";
let keepAliveTimer: number | undefined;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[char]!));

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

const LANGUAGE_LABELS: Record<LangCode, string> = {
  pl: "polski", en: "angielski", de: "niemiecki", fr: "francuski",
  es: "hiszpański", it: "włoski", pt: "portugalski", nl: "niderlandzki", ru: "rosyjski"
};

const LANGUAGE_PROFILES: Record<LangCode, { stopwords: Set<string>; diacritics?: RegExp }> = {
  pl: {
    stopwords: new Set(["i", "w", "na", "się", "nie", "to", "jest", "z", "do", "że", "co", "jak", "dla", "ale", "po", "o", "tak", "tym", "już", "tylko", "być", "go", "mu", "ich", "był", "była", "było", "będzie", "przez", "gdy", "który", "która"]),
    diacritics: /[ąćęłńóśźż]/i
  },
  en: {
    stopwords: new Set(["the", "and", "of", "to", "in", "is", "that", "it", "was", "for", "on", "with", "as", "he", "she", "you", "this", "but", "are", "not", "be", "at", "have", "from", "his", "her", "they"])
  },
  de: {
    stopwords: new Set(["der", "die", "das", "und", "ist", "nicht", "ein", "eine", "zu", "den", "mit", "sich", "des", "auf", "für", "dem", "er", "sie", "es", "war", "aber", "wie", "auch"]),
    diacritics: /[äöüß]/i
  },
  fr: {
    stopwords: new Set(["le", "la", "les", "des", "est", "une", "un", "et", "de", "que", "qui", "dans", "pour", "pas", "au", "du", "ce", "il", "elle", "avec", "sur", "vous"]),
    diacritics: /[àâçéèêëîïôùûüÿœ]/i
  },
  es: {
    stopwords: new Set(["el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "es", "por", "con", "no", "se", "su", "para", "como", "más", "pero", "lo"]),
    diacritics: /[ñ¿¡]/
  },
  it: {
    stopwords: new Set(["il", "lo", "la", "i", "gli", "le", "di", "che", "e", "un", "una", "è", "per", "con", "non", "si", "come", "ma", "anche", "sono"])
  },
  pt: {
    stopwords: new Set(["o", "a", "os", "as", "de", "que", "e", "um", "uma", "é", "para", "com", "não", "se", "como", "mas", "por", "seu"]),
    diacritics: /[ãõçâêô]/i
  },
  nl: {
    stopwords: new Set(["de", "het", "een", "en", "van", "is", "dat", "niet", "zijn", "op", "met", "voor", "aan", "je", "ik", "was", "maar"])
  },
  ru: {
    stopwords: new Set(["и", "в", "не", "на", "что", "он", "она", "с", "как", "это", "по", "но", "из", "за", "от", "к", "у", "же"])
  }
};

const LANG_ALIASES: Record<string, LangCode> = {
  eng: "en", en: "en",
  pol: "pl", pl: "pl",
  deu: "de", ger: "de", de: "de",
  fra: "fr", fre: "fr", fr: "fr",
  spa: "es", es: "es",
  ita: "it", it: "it",
  por: "pt", pt: "pt",
  nld: "nl", dut: "nl", nl: "nl",
  rus: "ru", ru: "ru"
};

function normalizeLangCode(raw?: string | null): LangCode | null {
  if (!raw) return null;
  const base = raw.trim().toLowerCase().split(/[-_]/)[0];
  return LANG_ALIASES[base] ?? null;
}

function detectLanguageScored(text: string): { lang: LangCode; score: number } {
  const words = text.toLowerCase().match(/\p{L}+/gu) || [];
  let best: LangCode = "en";
  let bestScore = 0;
  for (const code of Object.keys(LANGUAGE_PROFILES) as LangCode[]) {
    const profile = LANGUAGE_PROFILES[code];
    let score = 0;
    for (const word of words) if (profile.stopwords.has(word)) score += 1;
    if (profile.diacritics) score += (text.match(profile.diacritics)?.length ?? 0) * 0.5;
    if (score > bestScore) { bestScore = score; best = code; }
  }
  return { lang: best, score: bestScore };
}

// Splits `text` on every match of `boundary`, keeping exact absolute offsets
// of the pieces that remain (whitespace-only pieces are dropped).
function splitByBoundary(text: string, boundary: RegExp): { start: number; end: number; text: string }[] {
  const pieces: { start: number; end: number; text: string }[] = [];
  const re = new RegExp(boundary.source, boundary.flags.includes("g") ? boundary.flags : boundary.flags + "g");
  const push = (start: number, end: number) => {
    const raw = text.slice(start, end);
    if (raw.trim()) pieces.push({ start, end, text: raw });
  };
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    push(cursor, match.index);
    cursor = match.index + match[0].length;
  }
  push(cursor, text.length);
  return pieces;
}

// Detects language per paragraph, then splits each paragraph into sentences
// (inheriting the paragraph's language) so playback and highlighting can
// switch voices exactly where the language actually changes.
function buildSegments(text: string, declared: LangCode | null): { segments: LangSegment[]; dominant: LangCode } {
  const paragraphs = splitByBoundary(text, /\n{2,}/).map(paragraph => ({
    ...paragraph,
    guess: detectLanguageScored(paragraph.text)
  }));

  const totalsByLang = new Map<LangCode, number>();
  for (const paragraph of paragraphs) {
    if (paragraph.guess.score > 0) {
      totalsByLang.set(paragraph.guess.lang, (totalsByLang.get(paragraph.guess.lang) ?? 0) + paragraph.text.length);
    }
  }
  let dominant: LangCode = declared ?? "en";
  let dominantLength = declared ? (totalsByLang.get(declared) ?? 0) : -1;
  for (const [lang, length] of totalsByLang) {
    if (length > dominantLength) { dominantLength = length; dominant = lang; }
  }

  const segments: LangSegment[] = [];
  for (const paragraph of paragraphs) {
    const lang = paragraph.guess.score > 0 ? paragraph.guess.lang : dominant;
    for (const sentence of splitByBoundary(paragraph.text, /(?<=[.!?…])\s+/)) {
      segments.push({ start: paragraph.start + sentence.start, end: paragraph.start + sentence.end, lang });
    }
  }
  return { segments, dominant };
}

function ensureSegments(book: StoredBook) {
  if (book.segments?.length) return;
  const { segments, dominant } = buildSegments(book.text, normalizeLangCode(book.language) ?? null);
  book.segments = segments;
  book.language = dominant;
}

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

async function books(): Promise<StoredBook[]> {
  return (await (await dbPromise).getAll("books")).sort((a, b) => b.importedAt - a.importedAt);
}

async function renderLibrary(message = "") {
  stopSpeech();
  current = null;
  const items = await books();
  app.innerHTML = `
    <header><div><p class="eyebrow">LOCAL-FIRST READER</p><h1>Twoja biblioteka</h1></div>
      <label class="button">Dodaj książkę<input id="file" type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" hidden></label>
    </header>
    ${message ? `<p class="notice">${escapeHtml(message)}</p>` : ""}
    <main>${items.length ? `<section class="grid">${items.map(book => `
      <button class="book" data-id="${book.id}"><span class="cover">${book.format}</span>
        <span><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(book.author)}</small>
        <small>${Math.round(book.position / Math.max(book.text.length, 1) * 100)}% przeczytane</small></span></button>`).join("")}</section>` : `
      <section class="empty"><div class="empty-icon">Aa</div><h2>Dodaj swój pierwszy ebook</h2>
      <p>EPUB i tekstowe PDF-y są analizowane wyłącznie w tej przeglądarce.</p></section>`}</main>`;
  document.querySelector<HTMLInputElement>("#file")!.onchange = event => importFile((event.target as HTMLInputElement).files?.[0]);
  document.querySelectorAll<HTMLButtonElement>(".book").forEach(node => node.onclick = () => openBook(node.dataset.id!));
}

async function importFile(file?: File) {
  if (!file) return;
  try {
    const format = file.name.toLowerCase().endsWith(".epub") ? "EPUB" : file.name.toLowerCase().endsWith(".pdf") ? "PDF" : null;
    if (!format) throw new Error("Obsługiwane są tylko pliki EPUB i PDF.");
    app.innerHTML = `<section class="loading"><div class="spinner"></div><h2>Analizowanie książki…</h2><p>Plik nie opuszcza urządzenia.</p></section>`;
    const result = format === "EPUB" ? await extractEpub(file) : await extractPdf(file);
    if (!result.text.trim()) throw new Error("Nie znaleziono tekstu. Zeskanowane PDF-y będą obsługiwane w kolejnej wersji.");
    const id = await hash(file);
    const db = await dbPromise;
    if (await db.get("books", id)) throw new Error("Ta książka jest już w bibliotece.");
    const { segments, dominant } = buildSegments(result.text, result.declaredLanguage);
    await db.put("books", {
      id, name: file.name, format, position: 0, importedAt: Date.now(),
      title: result.title, author: result.author, text: result.text,
      language: dominant, segments
    } satisfies StoredBook);
    await renderLibrary("Książka została dodana.");
  } catch (error) {
    await renderLibrary(error instanceof Error ? error.message : "Nie udało się zaimportować książki.");
  }
}

async function extractEpub(file: File) {
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
  const decoder = new TextDecoder();
  const readXml = (path: string) => {
    const bytes = archive[path];
    if (!bytes) throw new Error(`Uszkodzony EPUB: brak ${path}.`);
    return new DOMParser().parseFromString(decoder.decode(bytes), "application/xml");
  };
  const container = readXml("META-INF/container.xml");
  const packagePath = container.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
  if (!packagePath) throw new Error("Uszkodzony EPUB: brak pakietu publikacji.");
  const packageDocument = readXml(packagePath);
  if (packageDocument.querySelector("parsererror")) throw new Error("Nie można odczytać metadanych EPUB.");
  const packageDirectory = packagePath.includes("/") ? packagePath.slice(0, packagePath.lastIndexOf("/") + 1) : "";
  const metadataValue = (name: string) =>
    [...packageDocument.getElementsByTagNameNS("*", name)][0]?.textContent?.trim() || "";
  const manifest = new Map(
    [...packageDocument.getElementsByTagName("item")].map(item => [item.getAttribute("id"), item.getAttribute("href")])
  );
  const blockSelector = "p, div, h1, h2, h3, h4, h5, h6, li, blockquote, td";
  const parts: string[] = [];
  for (const item of [...packageDocument.getElementsByTagName("itemref")]) {
    const href = manifest.get(item.getAttribute("idref"));
    if (!href) continue;
    const normalized = new URL(href, `https://local/${packageDirectory}`).pathname.slice(1);
    const bytes = archive[decodeURIComponent(normalized)] || archive[normalized];
    if (!bytes) continue;
    const doc = new DOMParser().parseFromString(decoder.decode(bytes), "application/xhtml+xml");
    if (!doc.body) continue;
    // Extract paragraph-by-paragraph so blank-line boundaries survive for
    // language segmentation and readable on-page layout. Keep only leaf
    // blocks so a wrapping div does not duplicate the text of its paragraphs.
    const blocks = [...doc.body.querySelectorAll(blockSelector)]
      .filter(node => !node.querySelector(blockSelector))
      .map(node => node.textContent?.replace(/\s+/g, " ").trim())
      .filter((text): text is string => !!text);
    const text = blocks.length ? blocks.join("\n\n") : doc.body.textContent?.replace(/\s+/g, " ").trim();
    if (text) parts.push(text);
  }
  return {
    title: metadataValue("title") || file.name.replace(/\.epub$/i, ""),
    author: metadataValue("creator") || "Nieznany autor",
    text: parts.join("\n\n"),
    declaredLanguage: normalizeLangCode(metadataValue("language"))
  };
}

async function extractPdf(file: File) {
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const parts: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    parts.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
  }
  const metadata = await document.getMetadata().catch(() => null);
  const info = metadata?.info as { Title?: string; Author?: string; Language?: string } | undefined;
  let declaredLanguage = normalizeLangCode(info?.Language);
  if (!declaredLanguage) {
    try { declaredLanguage = normalizeLangCode(metadata?.metadata?.get("dc:language") as string | undefined); }
    catch { /* XMP metadata is optional */ }
  }
  return {
    title: info?.Title || file.name.replace(/\.pdf$/i, ""),
    author: info?.Author || "Nieznany autor",
    text: parts.join("\n\n"),
    declaredLanguage
  };
}

async function hash(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------

async function openBook(id: string) {
  current = await (await dbPromise).get("books", id);
  if (!current) return renderLibrary("Nie znaleziono książki.");
  ensureSegments(current);
  await (await dbPromise).put("books", current);
  voices = speechSynthesis.getVoices();
  renderReader();
}

function buildArticleHtml(text: string, segments: LangSegment[], position: number): string {
  if (!segments.length) return `<p>${escapeHtml(text)}</p>`;
  let html = "";
  let paragraphOpen = false;
  segments.forEach((segment, index) => {
    if (!paragraphOpen) { html += "<p>"; paragraphOpen = true; }
    const isCurrent = position >= segment.start && position < segment.end;
    html += `<span class="sentence${isCurrent ? " current" : ""}" data-start="${segment.start}">${escapeHtml(text.slice(segment.start, segment.end))}</span> `;
    const next = segments[index + 1];
    if (!next || /\n{2,}/.test(text.slice(segment.end, next.start))) { html += "</p>"; paragraphOpen = false; }
  });
  if (paragraphOpen) html += "</p>";
  return html;
}

function renderReader() {
  if (!current) return;
  const article = buildArticleHtml(current.text, current.segments, current.position);
  const autoLabel = `Automatyczny (wg języka: ${LANGUAGE_LABELS[current.language] ?? current.language})`;
  app.innerHTML = `<header><button class="ghost" id="back">← Biblioteka</button><div><h1>${escapeHtml(current.title)}</h1><p>${escapeHtml(current.author)}</p></div></header>
    <p class="notice" id="ttsNotice" hidden></p>
    <main class="reader"><article id="article">${article}</article></main>
    <footer><select id="voice" aria-label="Głos narratora">
        <option value="auto" ${selectedVoiceURI === "auto" ? "selected" : ""}>${escapeHtml(autoLabel)}</option>
        ${voices.map(voice => `<option value="${escapeHtml(voice.voiceURI)}" ${voice.voiceURI === selectedVoiceURI ? "selected" : ""}>${escapeHtml(voice.name)} · ${voice.lang}${voice.localService ? "" : " · sieciowy"}</option>`).join("")}
      </select>
      <button id="rewind" class="ghost">−15 zdań</button><button id="play" class="play">${speaking ? "Pauza" : "Czytaj"}</button></footer>`;
  document.querySelector<HTMLButtonElement>("#back")!.onclick = () => renderLibrary();
  document.querySelector<HTMLButtonElement>("#play")!.onclick = toggleSpeech;
  document.querySelector<HTMLButtonElement>("#rewind")!.onclick = () => rewind(15);
  document.querySelector<HTMLSelectElement>("#voice")!.onchange = event => {
    selectedVoiceURI = (event.target as HTMLSelectElement).value;
    localStorage.setItem("voiceSelection", selectedVoiceURI);
    if (speaking) restartFrom(current!.position);
  };
  document.querySelector(".sentence.current")?.scrollIntoView({ block: "center" });
}

function showNotice(message: string) {
  const notice = document.querySelector<HTMLParagraphElement>("#ttsNotice");
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = false;
}

function highlightSegment(segment: LangSegment) {
  document.querySelectorAll<HTMLElement>(".sentence.current").forEach(node => node.classList.remove("current"));
  const el = document.querySelector<HTMLElement>(`.sentence[data-start="${segment.start}"]`);
  el?.classList.add("current");
  el?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function segmentIndexAt(position: number): number {
  const segments = current?.segments ?? [];
  let lo = 0, hi = segments.length - 1, result = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= position) { result = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return result;
}

function persistPosition(position: number) {
  if (!current) return;
  current.position = position;
  dbPromise.then(db => db.put("books", current!));
}

// Prefers a matching, locally-installed voice (reliable) over a matching
// network voice, and falls back to any locally-installed voice rather than
// silently picking nothing.
function resolveVoice(lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const prefix = lang.toLowerCase();
  const matches = voices.filter(voice => voice.lang.toLowerCase().startsWith(prefix));
  return matches.find(voice => voice.localService) ?? matches[0] ?? voices.find(voice => voice.localService) ?? voices[0];
}

function pickVoice(lang: LangCode): SpeechSynthesisVoice | null {
  if (selectedVoiceURI !== "auto") {
    const manual = voices.find(voice => voice.voiceURI === selectedVoiceURI);
    if (manual) return manual;
  }
  return resolveVoice(lang);
}

function startKeepAlive() {
  stopKeepAlive();
  // Chromium silently stalls long-running speech (most noticeable with
  // network/"Google" voices) unless it is nudged periodically.
  keepAliveTimer = window.setInterval(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      speechSynthesis.resume();
    }
  }, 4000);
}

function stopKeepAlive() {
  if (keepAliveTimer !== undefined) { clearInterval(keepAliveTimer); keepAliveTimer = undefined; }
}

// Kept in module scope (rather than a local variable) so the browser never
// garbage-collects an in-flight utterance, which otherwise silently kills
// speech partway through — a long-standing Chromium bug.
let activeUtterance: SpeechSynthesisUtterance | null = null;

function speakSegment(index: number, forceLocal = false) {
  if (!current || !speaking) return;
  const segments = current.segments;
  if (index >= segments.length) {
    speaking = false;
    stopKeepAlive();
    renderReader();
    return;
  }
  const segment = segments[index];
  // Network ("Google") voices sometimes never fire a single event when they
  // fail — no onstart, no onerror, just silence. forceLocal is the retry
  // path once that's been detected, so it always picks a locally-installed
  // voice, which is reliable.
  const voice = forceLocal
    ? voices.find(v => v.localService && v.lang.toLowerCase().startsWith(segment.lang)) ?? voices.find(v => v.localService) ?? null
    : pickVoice(segment.lang);
  const utterance = new SpeechSynthesisUtterance(current.text.slice(segment.start, segment.end));
  utterance.voice = voice;
  utterance.lang = voice?.lang || segment.lang;

  let started = false;
  let settled = false;
  const watchdog = window.setTimeout(() => {
    if (started || settled) return;
    settled = true;
    console.warn("Speech never started for voice:", voice?.name);
    if (!speaking) return;
    speechSynthesis.cancel();
    activeUtterance = null;
    if (forceLocal) { showNotice("Synteza mowy nie odpowiada dla tego fragmentu. Pomijam."); speakSegment(index + 1); }
    else { showNotice(`Głos „${voice?.name ?? "nieznany"}" nie odpowiedział. Przełączono na głos lokalny.`); speakSegment(index, true); }
  }, 2500);

  utterance.onstart = () => { started = true; };
  utterance.onend = () => {
    if (settled) return;
    settled = true;
    clearTimeout(watchdog);
    if (!speaking) return;
    persistPosition(segment.end);
    speakSegment(index + 1);
  };
  utterance.onerror = event => {
    if (settled) return;
    if (event.error === "interrupted" || event.error === "canceled") { settled = true; clearTimeout(watchdog); return; }
    settled = true;
    clearTimeout(watchdog);
    console.warn("Speech synthesis error:", event.error, "voice:", voice?.name);
    if (!speaking) return;
    if (forceLocal) { showNotice("Synteza mowy nie działa dla tego fragmentu. Pomijam."); speakSegment(index + 1); }
    else { showNotice(`Głos „${voice?.name ?? "nieznany"}" nie działa w tej przeglądarce. Przełączono na głos lokalny.`); speakSegment(index, true); }
  };

  activeUtterance = utterance;
  persistPosition(segment.start);
  highlightSegment(segment);
  speechSynthesis.speak(utterance);
}

function restartFrom(position: number) {
  speechSynthesis.cancel();
  speakSegment(segmentIndexAt(position));
}

function stopSpeech() {
  speaking = false;
  stopKeepAlive();
  speechSynthesis.cancel();
  activeUtterance = null;
}

function toggleSpeech() {
  if (!current) return;
  if (speaking) {
    stopSpeech();
    renderReader();
    return;
  }
  speaking = true;
  startKeepAlive();
  renderReader();
  speakSegment(segmentIndexAt(current.position));
}

function rewind(count: number) {
  if (!current) return;
  const wasSpeaking = speaking;
  if (wasSpeaking) { speechSynthesis.cancel(); stopKeepAlive(); }
  const index = Math.max(0, segmentIndexAt(current.position) - count);
  current.position = current.segments[index]?.start ?? 0;
  dbPromise.then(db => db.put("books", current!));
  if (wasSpeaking) { startKeepAlive(); renderReader(); speakSegment(index); }
  else renderReader();
}

speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
  if (current && !speaking) renderReader();
};
renderLibrary();
