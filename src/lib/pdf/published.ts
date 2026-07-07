import { readFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

const JOURNAL_TITLE = "Nigerian Medical and Allied Sciences Research Publication";
const TAGLINE = "Advancing Health. Generating Knowledge. Impacting Lives.";
const WEBSITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
const NAVY = rgb(0, 0.105, 0.267);
const GREEN = rgb(0.106, 0.427, 0.141);
const MUTED = rgb(0.35, 0.39, 0.45);
const BORDER = rgb(0.78, 0.78, 0.83);

type PdfAuthor = {
  display_name: string;
  affiliation: string | null;
};

type PdfArticle = {
  title: string;
  abstract: string;
  manuscriptBody?: string | null;
  authors: PdfAuthor[];
  keywords?: string[];
  sectionName?: string | null;
  doi?: string | null;
  publicationDate?: string | null;
  volume?: number | null;
  issue?: number | null;
  articleUrl?: string | null;
  websiteUrl?: string | null;
};

type PublicationMetadata = {
  volume?: number | null;
  issue?: number | null;
  websiteUrl?: string | null;
  articleUrl?: string | null;
  doi?: string | null;
  publicationDate?: string | null;
};

function cleanText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number) {
  const clean = cleanText(value);
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

function publicationMonth(date: string | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

function doiUrl(doi: string | null | undefined) {
  if (!doi) return null;
  return doi.startsWith("http") ? doi : `https://doi.org/${doi}`;
}

function metadataLine(metadata?: PublicationMetadata) {
  const parts: string[] = [];
  if (metadata?.volume) parts.push(`Volume ${metadata.volume}`);
  if (metadata?.issue) parts.push(`Issue ${metadata.issue}`);
  const month = publicationMonth(metadata?.publicationDate);
  if (month) parts.push(month);
  if (metadata?.doi) parts.push(`DOI: ${doiUrl(metadata.doi)}`);
  return parts.join(" | ");
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
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

function manuscriptSections(body: string | null | undefined) {
  const clean = String(body ?? "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const sections: { heading: string; body: string }[] = [];
  let heading = "Full text";
  let lines: string[] = [];

  for (const rawLine of clean.split("\n")) {
    const line = rawLine.trim();
    const markdownHeading = line.match(/^#{1,3}\s+(.+)$/);
    const plainHeading =
      /^[A-Z][A-Za-z\s/&-]{2,48}:$/.test(line) && line.split(/\s+/).length <= 8;

    if ((markdownHeading || plainHeading) && lines.join(" ").trim()) {
      sections.push({ heading, body: lines.join("\n").trim() });
      heading = cleanText(markdownHeading?.[1] ?? line.replace(/:$/, ""));
      lines = [];
    } else if (markdownHeading || plainHeading) {
      heading = cleanText(markdownHeading?.[1] ?? line.replace(/:$/, ""));
    } else {
      lines.push(rawLine);
    }
  }

  if (lines.join(" ").trim()) {
    sections.push({ heading, body: lines.join("\n").trim() });
  }

  return sections;
}

async function embedLogo(pdf: PDFDocument) {
  const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
  const logoBytes = await readFile(logoPath);
  return pdf.embedPng(logoBytes);
}

function drawChrome({
  page,
  logo,
  bold,
  regular,
  pageNumber,
  pageCount,
  articleTitle,
  metadata,
}: {
  page: PDFPage;
  logo: PDFImage;
  bold: PDFFont;
  regular: PDFFont;
  pageNumber: number;
  pageCount: number;
  articleTitle: string;
  metadata?: PublicationMetadata;
}) {
  const { width, height } = page.getSize();
  const margin = 46;

  page.drawRectangle({
    x: 0,
    y: height - 68,
    width,
    height: 68,
    color: rgb(1, 1, 1),
  });
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 52,
    color: rgb(1, 1, 1),
  });

  page.drawImage(logo, {
    x: margin,
    y: height - 52,
    width: 44,
    height: 24,
  });
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
  page.drawText(cleanText(metadata?.websiteUrl ?? WEBSITE_URL), {
    x: margin,
    y: height - 58,
    size: 6.5,
    font: regular,
    color: MUTED,
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
  page.drawText(truncate(articleTitle, 72), {
    x: margin,
    y: 28,
    size: 7,
    font: regular,
    color: MUTED,
  });

  const meta = truncate(metadataLine(metadata), 92);
  if (meta) {
    page.drawText(meta, {
      x: margin,
      y: 18,
      size: 6.5,
      font: regular,
      color: MUTED,
    });
  }

  const link = truncate(
    cleanText(metadata?.articleUrl ?? metadata?.websiteUrl ?? WEBSITE_URL),
    78
  );
  page.drawText(link, {
    x: margin,
    y: 10,
    size: 6,
    font: regular,
    color: GREEN,
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

export async function brandPublishedPdf(
  inputPdf: ArrayBuffer | Uint8Array,
  articleTitle: string,
  metadata?: PublicationMetadata
) {
  const pdf = await PDFDocument.load(inputPdf);
  const logo = await embedLogo(pdf);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();

  pages.forEach((page, index) => {
    drawChrome({
      page,
      logo,
      regular,
      bold,
      pageNumber: index + 1,
      pageCount: pages.length,
      articleTitle,
      metadata,
    });
  });

  return pdf.save();
}

export async function generateGhostPublishedPdf(article: PdfArticle) {
  const pdf = await PDFDocument.create();
  const logo = await embedLogo(pdf);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 58;
  const contentTop = 752;
  const contentBottom = 76;
  const contentWidth = pageSize[0] - margin * 2;
  const pages: PDFPage[] = [];
  let page = pdf.addPage(pageSize);
  pages.push(page);
  let y = contentTop;

  function addPage() {
    page = pdf.addPage(pageSize);
    pages.push(page);
    y = contentTop;
  }

  function ensureSpace(height: number) {
    if (y - height < contentBottom) addPage();
  }

  function drawWrapped(
    text: string,
    font: PDFFont,
    size: number,
    lineHeight: number,
    color = rgb(0.1, 0.1, 0.12)
  ) {
    const lines = wrapText(text, font, size, contentWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: margin, y, size, font, color });
      y -= lineHeight;
    }
  }

  function drawParagraphs(
    text: string,
    font: PDFFont,
    size: number,
    lineHeight: number,
    color = rgb(0.1, 0.1, 0.12)
  ) {
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const paragraph of paragraphs) {
      drawWrapped(paragraph, font, size, lineHeight, color);
      y -= 8;
    }
  }

  drawWrapped(article.title, serifBold, 20, 25, NAVY);
  y -= 12;

  const authorLine = article.authors.map((a) => cleanText(a.display_name)).join(", ");
  drawWrapped(authorLine, regular, 10, 14, rgb(0.16, 0.18, 0.21));
  y -= 8;

  const affiliations = article.authors
    .map((a) => cleanText(a.affiliation))
    .filter(Boolean);
  if (affiliations.length > 0) {
    drawWrapped([...new Set(affiliations)].join("; "), regular, 8, 12, MUTED);
    y -= 12;
  }

  const meta: string[] = [];
  if (article.sectionName) meta.push(`Section: ${article.sectionName}`);
  if (article.volume) meta.push(`Volume ${article.volume}`);
  if (article.issue) meta.push(`Issue ${article.issue}`);
  const month = publicationMonth(article.publicationDate);
  if (month) meta.push(`Published: ${month}`);
  if (article.doi) meta.push(`DOI: ${doiUrl(article.doi)}`);
  if (article.articleUrl) meta.push(`Article URL: ${article.articleUrl}`);
  meta.push(`Website: ${article.websiteUrl ?? WEBSITE_URL}`);
  if (meta.length > 0) {
    drawWrapped(meta.join(" | "), bold, 8, 12, GREEN);
    y -= 18;
  }

  drawWrapped("Abstract", bold, 12, 16, NAVY);
  y -= 4;
  drawWrapped(article.abstract, serif, 11, 16);

  if (article.keywords && article.keywords.length > 0) {
    y -= 14;
    drawWrapped("Keywords", bold, 12, 16, NAVY);
    y -= 4;
    drawWrapped(article.keywords.join(", "), regular, 9, 13, MUTED);
  }

  const sections = manuscriptSections(article.manuscriptBody);
  if (sections.length > 0) {
    y -= 18;
    for (const section of sections) {
      ensureSpace(46);
      drawWrapped(section.heading, bold, 12, 16, NAVY);
      y -= 4;
      drawParagraphs(section.body, serif, 11, 16);
      y -= 6;
    }
  } else {
    y -= 18;
    drawWrapped("Full text", bold, 12, 16, NAVY);
    y -= 4;
    drawWrapped(
      "No full manuscript body was supplied in the ghost publishing form. Upload the final PDF or regenerate this article after entering manuscript body text to create a complete full-text PDF.",
      serif,
      11,
      16,
      MUTED
    );
  }

  pages.forEach((p, index) => {
    drawChrome({
      page: p,
      logo,
      regular,
      bold,
      pageNumber: index + 1,
      pageCount: pages.length,
      articleTitle: article.title,
      metadata: {
        volume: article.volume,
        issue: article.issue,
        websiteUrl: article.websiteUrl,
        articleUrl: article.articleUrl,
        doi: article.doi,
        publicationDate: article.publicationDate,
      },
    });
  });

  return pdf.save();
}
