import "./styles.css";
import { unzipSync } from "fflate";
import { openDB } from "idb";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type StoredBook = {
  id: string;
  name: string;
  format: "EPUB" | "PDF";
  title: string;
  author: string;
  text: string;
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

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[char]!));

async function books(): Promise<StoredBook[]> {
  return (await (await dbPromise).getAll("books")).sort((a, b) => b.importedAt - a.importedAt);
}

async function renderLibrary(message = "") {
  speechSynthesis.cancel();
  speaking = false;
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
    await db.put("books", { id, name: file.name, format, position: 0, importedAt: Date.now(), ...result });
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
  const parts: string[] = [];
  for (const item of [...packageDocument.getElementsByTagName("itemref")]) {
    const href = manifest.get(item.getAttribute("idref"));
    if (!href) continue;
    const normalized = new URL(href, `https://local/${packageDirectory}`).pathname.slice(1);
    const bytes = archive[decodeURIComponent(normalized)] || archive[normalized];
    if (!bytes) continue;
    const doc = new DOMParser().parseFromString(decoder.decode(bytes), "application/xhtml+xml");
    const text = doc.body?.textContent?.replace(/\s+/g, " ").trim();
    if (text) parts.push(text);
  }
  return {
    title: metadataValue("title") || file.name.replace(/\.epub$/i, ""),
    author: metadataValue("creator") || "Nieznany autor",
    text: parts.join("\n\n")
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
  const info = metadata?.info as { Title?: string; Author?: string } | undefined;
  return { title: info?.Title || file.name.replace(/\.pdf$/i, ""), author: info?.Author || "Nieznany autor", text: parts.join("\n\n") };
}

async function hash(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function openBook(id: string) {
  current = await (await dbPromise).get("books", id);
  if (!current) return renderLibrary("Nie znaleziono książki.");
  voices = speechSynthesis.getVoices();
  renderReader();
}

function renderReader() {
  if (!current) return;
  const excerpt = current.text.slice(current.position);
  app.innerHTML = `<header><button class="ghost" id="back">← Biblioteka</button><div><h1>${escapeHtml(current.title)}</h1><p>${escapeHtml(current.author)}</p></div></header>
    <main class="reader"><article>${escapeHtml(excerpt)}</article></main>
    <footer><select id="voice" aria-label="Głos narratora">${voices.map((voice, i) => `<option value="${i}">${escapeHtml(voice.name)} · ${voice.lang}</option>`).join("")}</select>
      <button id="rewind" class="ghost">−15 zdań</button><button id="play" class="play">${speaking ? "Pauza" : "Czytaj"}</button></footer>`;
  document.querySelector<HTMLButtonElement>("#back")!.onclick = () => renderLibrary();
  document.querySelector<HTMLButtonElement>("#play")!.onclick = toggleSpeech;
  document.querySelector<HTMLButtonElement>("#rewind")!.onclick = () => { if (current) current.position = Math.max(0, current.position - 1000); renderReader(); };
}

function toggleSpeech() {
  if (!current) return;
  if (speaking) { speechSynthesis.cancel(); speaking = false; renderReader(); return; }
  const utterance = new SpeechSynthesisUtterance(current.text.slice(current.position, current.position + 12000));
  const startPosition = current.position;
  const selected = Number(document.querySelector<HTMLSelectElement>("#voice")?.value || 0);
  utterance.voice = voices[selected] || null;
  utterance.onboundary = event => {
    if (event.name === "word" && current) {
      current.position = startPosition + event.charIndex;
      dbPromise.then(db => db.put("books", current!));
    }
  };
  utterance.onend = () => { speaking = false; renderReader(); };
  speaking = true;
  speechSynthesis.speak(utterance);
  renderReader();
}

speechSynthesis.onvoiceschanged = () => { voices = speechSynthesis.getVoices(); };
renderLibrary();
