import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const envText = await readFile(".env.local", "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.match(/^([^#=]+)=(.*)$/))
    .filter(Boolean)
    .map((match) => [match[1].trim(), match[2].trim()])
);

const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
const authHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

const JOURNAL_TITLE = "Nigerian Medical and Allied Sciences Research Publication";
const TAGLINE = "Advancing Health. Generating Knowledge. Impacting Lives.";
const NAVY = rgb(0, 0.105, 0.267);
const GREEN = rgb(0.106, 0.427, 0.141);
const MUTED = rgb(0.35, 0.39, 0.45);
const BORDER = rgb(0.78, 0.78, 0.83);

async function rest(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: { ...authHeaders, ...(init.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("application/json")
    ? response.json()
    : new Uint8Array(await response.arrayBuffer());
}

function clean(value) {
  return String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max) {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function publicationMonth(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

function doiUrl(doi) {
  if (!doi) return null;
  return doi.startsWith("http") ? doi : `https://doi.org/${doi}`;
}

function metadataLine(article) {
  const parts = [];
  if (article.volume_number) parts.push(`Volume ${article.volume_number}`);
  if (article.issue_number) parts.push(`Issue ${article.issue_number}`);
  const month = publicationMonth(article.publication_date);
  if (month) parts.push(month);
  if (article.doi) parts.push(`DOI: ${doiUrl(article.doi)}`);
  return parts.join(" | ");
}

function drawChrome({ page, logo, regular, bold, article, index, count }) {
  const { width, height } = page.getSize();
  const margin = 46;
  page.drawRectangle({ x: 0, y: height - 68, width, height: 68, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: 0, width, height: 52, color: rgb(1, 1, 1) });
  page.drawImage(logo, { x: margin, y: height - 52, width: 44, height: 24 });
  page.drawText(JOURNAL_TITLE, { x: margin + 54, y: height - 34, size: 9, font: bold, color: NAVY });
  page.drawText(TAGLINE, { x: margin + 54, y: height - 47, size: 7, font: regular, color: GREEN });
  page.drawText(siteUrl, { x: margin, y: height - 58, size: 6.5, font: regular, color: MUTED });
  page.drawLine({ start: { x: margin, y: height - 62 }, end: { x: width - margin, y: height - 62 }, thickness: 0.6, color: BORDER });
  page.drawLine({ start: { x: margin, y: 44 }, end: { x: width - margin, y: 44 }, thickness: 0.6, color: BORDER });
  page.drawText(truncate(article.title, 72), { x: margin, y: 28, size: 7, font: regular, color: MUTED });
  const meta = truncate(metadataLine(article), 92);
  if (meta) page.drawText(meta, { x: margin, y: 18, size: 6.5, font: regular, color: MUTED });
  page.drawText(truncate(`${siteUrl}/articles/${article.slug}`, 78), {
    x: margin,
    y: 10,
    size: 6,
    font: regular,
    color: GREEN,
  });
  const pageText = `Page ${index + 1} of ${count}`;
  page.drawText(pageText, {
    x: width - margin - regular.widthOfTextAtSize(pageText, 8),
    y: 28,
    size: 8,
    font: bold,
    color: NAVY,
  });
}

const articles = await rest(
  "/rest/v1/articles?select=id,title,slug,pdf_path,doi,publication_date,issue_id&pdf_path=not.is.null"
);

for (const article of articles ?? []) {
  const [issue] = article.issue_id
    ? await rest(`/rest/v1/issues?select=number,volume_id&id=eq.${article.issue_id}`)
    : [];
  const [volume] = issue?.volume_id
    ? await rest(`/rest/v1/volumes?select=number&id=eq.${issue.volume_id}`)
    : [];
  const pdfBytes = await rest(`/storage/v1/object/published-pdfs/${article.pdf_path}`);
  const pdf = await PDFDocument.load(pdfBytes);
  const logo = await pdf.embedPng(await readFile(path.join("public", "images", "logo.png")));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const enriched = {
    ...article,
    issue_number: issue?.number ?? null,
    volume_number: volume?.number ?? null,
  };
  const pages = pdf.getPages();
  pages.forEach((page, index) =>
    drawChrome({ page, logo, regular, bold, article: enriched, index, count: pages.length })
  );
  await rest(`/storage/v1/object/published-pdfs/${article.pdf_path}`, {
    method: "POST",
    headers: { "Content-Type": "application/pdf", "x-upsert": "true" },
    body: await pdf.save(),
  });
  console.log(`Restamped ${article.id}: ${article.pdf_path}`);
}
