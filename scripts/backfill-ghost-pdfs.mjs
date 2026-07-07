import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

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
const authHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
};

async function rest(pathname, init = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

const JOURNAL_TITLE = "Nigerian Medical and Allied Sciences Research Publication";
const TAGLINE = "Advancing Health. Generating Knowledge. Impacting Lives.";
const NAVY = rgb(0, 0.105, 0.267);
const GREEN = rgb(0.106, 0.427, 0.141);
const MUTED = rgb(0.35, 0.39, 0.45);
const BORDER = rgb(0.78, 0.78, 0.83);

function cleanText(value) {
  return String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(text, font, fontSize, maxWidth) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncate(value, max) {
  const clean = cleanText(value);
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

function drawChrome({ page, logo, regular, bold, pageNumber, pageCount, title }) {
  const { width, height } = page.getSize();
  const margin = 46;
  page.drawImage(logo, { x: margin, y: height - 52, width: 44, height: 24 });
  page.drawText(JOURNAL_TITLE, {
    x: margin + 54,
    y: height - 34,
    size: 9,
    font: bold,
    color: NAVY,
  });
  page.drawText(TAGLINE, {
    x: margin + 54,
    y: height - 47,
    size: 7,
    font: regular,
    color: GREEN,
  });
  page.drawLine({
    start: { x: margin, y: height - 62 },
    end: { x: width - margin, y: height - 62 },
    thickness: 0.6,
    color: BORDER,
  });
  page.drawLine({
    start: { x: margin, y: 44 },
    end: { x: width - margin, y: 44 },
    thickness: 0.6,
    color: BORDER,
  });
  page.drawText(truncate(title, 72), {
    x: margin,
    y: 28,
    size: 7,
    font: regular,
    color: MUTED,
  });
  const pageText = `Page ${pageNumber} of ${pageCount}`;
  page.drawText(pageText, {
    x: width - margin - regular.widthOfTextAtSize(pageText, 8),
    y: 28,
    size: 8,
    font: bold,
    color: NAVY,
  });
}

async function generatePdf(article, authors, sectionName) {
  const pdf = await PDFDocument.create();
  const logo = await pdf.embedPng(
    await readFile(path.join("public", "images", "logo.png"))
  );
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const pageSize = [595.28, 841.89];
  const margin = 58;
  const contentTop = 752;
  const contentBottom = 76;
  const contentWidth = pageSize[0] - margin * 2;
  const pages = [];
  let page = pdf.addPage(pageSize);
  pages.push(page);
  let y = contentTop;

  function addPage() {
    page = pdf.addPage(pageSize);
    pages.push(page);
    y = contentTop;
  }

  function ensureSpace(height) {
    if (y - height < contentBottom) addPage();
  }

  function drawWrapped(text, font, size, lineHeight, color = rgb(0.1, 0.1, 0.12)) {
    for (const line of wrapText(text, font, size, contentWidth)) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: margin, y, size, font, color });
      y -= lineHeight;
    }
  }

  drawWrapped(article.title, serifBold, 20, 25, NAVY);
  y -= 12;
  drawWrapped(authors.map((a) => a.display_name).join(", "), regular, 10, 14);
  y -= 8;
  const affiliations = authors.map((a) => cleanText(a.affiliation)).filter(Boolean);
  if (affiliations.length) {
    drawWrapped([...new Set(affiliations)].join("; "), regular, 8, 12, MUTED);
    y -= 12;
  }
  drawWrapped(`Section: ${sectionName ?? "General"}`, bold, 8, 12, GREEN);
  y -= 18;
  drawWrapped("Abstract", bold, 12, 16, NAVY);
  y -= 4;
  drawWrapped(article.abstract, serif, 11, 16);
  if (article.keywords?.length) {
    y -= 14;
    drawWrapped("Keywords", bold, 12, 16, NAVY);
    y -= 4;
    drawWrapped(article.keywords.join(", "), regular, 9, 13, MUTED);
  }

  pages.forEach((p, index) =>
    drawChrome({
      page: p,
      logo,
      regular,
      bold,
      pageNumber: index + 1,
      pageCount: pages.length,
      title: article.title,
    })
  );

  return pdf.save();
}

const articles = await rest(
  "/rest/v1/articles?select=id,title,abstract,keywords,slug,section_id&submitted_via=eq.admin_proxy&pdf_path=is.null"
);

for (const article of articles ?? []) {
  const [authors, sections] = await Promise.all([
    rest(
      `/rest/v1/article_authors?select=display_name,affiliation&article_id=eq.${article.id}&order=author_order.asc`
    ),
    rest(`/rest/v1/sections?select=name&id=eq.${article.section_id}`),
  ]);

  const pdfBytes = await generatePdf(article, authors ?? [], sections?.[0]?.name);
  const pdfPath = `${article.id}/${article.slug}.pdf`;
  await rest(`/storage/v1/object/published-pdfs/${pdfPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: pdfBytes,
  });

  await rest(`/rest/v1/articles?id=eq.${article.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ pdf_path: pdfPath }),
  });

  console.log(`Backfilled PDF for ${article.id}: ${pdfPath}`);
}
