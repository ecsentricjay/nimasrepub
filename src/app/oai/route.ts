import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";
const REPOSITORY_NAME =
  "Nigerian Medical and Allied Sciences Research Publication";
const ADMIN_EMAIL = "editorial@nimasrepub.com.ng";

type OaiArticle = {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  keywords: string[];
  language: string;
  doi: string | null;
  publication_date: string | null;
  published_at: string | null;
  updated_at: string;
  section_id: string;
  section?: { name: string; slug: string } | null;
  authors?: { display_name: string }[];
};

function xml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function oaiIdentifier(id: string) {
  return `oai:nimasrepub.com.ng:article/${id}`;
}

function datestamp(article: Pick<OaiArticle, "published_at" | "updated_at">) {
  return new Date(article.published_at ?? article.updated_at)
    .toISOString()
    .slice(0, 10);
}

function envelope(requestUrl: string, verb: string, body: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${new Date().toISOString()}</responseDate>
  <request verb="${xml(verb)}">${xml(requestUrl)}</request>
  ${body}
</OAI-PMH>`;
}

function errorResponse(requestUrl: string, code: string, message: string) {
  return envelope(
    requestUrl,
    "",
    `<error code="${xml(code)}">${xml(message)}</error>`
  );
}

async function getPublishedArticles(set?: string | null): Promise<OaiArticle[]> {
  const db = createServiceRoleClient();

  let sectionId: string | null = null;
  if (set?.startsWith("section:")) {
    const slug = set.replace("section:", "");
    const { data: section } = await db
      .from("sections")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!section) return [];
    sectionId = section.id;
  }

  let query = db
    .from("articles")
    .select(
      "id, title, slug, abstract, keywords, language, doi, publication_date, published_at, updated_at, section_id"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (sectionId) query = query.eq("section_id", sectionId);

  const { data: articles } = await query;
  if (!articles || articles.length === 0) return [];

  const articleIds = articles.map((article) => article.id);
  const sectionIds = [...new Set(articles.map((article) => article.section_id))];

  const [{ data: authors }, { data: sections }] = await Promise.all([
    db
      .from("article_authors")
      .select("article_id, display_name")
      .in("article_id", articleIds)
      .order("author_order"),
    db.from("sections").select("id, name, slug").in("id", sectionIds),
  ]);

  return articles.map((article) => ({
    ...article,
    section: sections?.find((section) => section.id === article.section_id) ?? null,
    authors:
      authors
        ?.filter((author) => author.article_id === article.id)
        .map((author) => ({ display_name: author.display_name })) ?? [],
  }));
}

async function identify(requestUrl: string) {
  const articles = await getPublishedArticles();
  const earliest = articles.at(-1);

  return envelope(
    requestUrl,
    "Identify",
    `<Identify>
    <repositoryName>${xml(REPOSITORY_NAME)}</repositoryName>
    <baseURL>${xml(`${SITE_URL}/oai`)}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>${xml(ADMIN_EMAIL)}</adminEmail>
    <earliestDatestamp>${xml(earliest ? datestamp(earliest) : new Date().toISOString().slice(0, 10))}</earliestDatestamp>
    <deletedRecord>no</deletedRecord>
    <granularity>YYYY-MM-DD</granularity>
  </Identify>`
  );
}

function listMetadataFormats(requestUrl: string) {
  return envelope(
    requestUrl,
    "ListMetadataFormats",
    `<ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>`
  );
}

async function listSets(requestUrl: string) {
  const db = createServiceRoleClient();
  const { data: sections } = await db
    .from("sections")
    .select("name, slug")
    .order("name");

  return envelope(
    requestUrl,
    "ListSets",
    `<ListSets>
    ${(sections ?? [])
      .map(
        (section) => `<set>
      <setSpec>section:${xml(section.slug)}</setSpec>
      <setName>${xml(section.name)}</setName>
    </set>`
      )
      .join("\n")}
  </ListSets>`
  );
}

function header(article: OaiArticle) {
  return `<header>
      <identifier>${xml(oaiIdentifier(article.id))}</identifier>
      <datestamp>${xml(datestamp(article))}</datestamp>
      ${article.section ? `<setSpec>section:${xml(article.section.slug)}</setSpec>` : ""}
    </header>`;
}

function record(article: OaiArticle) {
  const articleUrl = `${SITE_URL}/articles/${article.slug}`;
  const doiUrl = article.doi
    ? article.doi.startsWith("http")
      ? article.doi
      : `https://doi.org/${article.doi}`
    : null;

  return `<record>
    ${header(article)}
    <metadata>
      <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">
        <dc:title>${xml(article.title)}</dc:title>
        ${(article.authors ?? [])
          .map((author) => `<dc:creator>${xml(author.display_name)}</dc:creator>`)
          .join("\n        ")}
        <dc:description>${xml(article.abstract)}</dc:description>
        ${(article.keywords ?? [])
          .map((keyword) => `<dc:subject>${xml(keyword)}</dc:subject>`)
          .join("\n        ")}
        ${article.section ? `<dc:subject>${xml(article.section.name)}</dc:subject>` : ""}
        <dc:publisher>${xml(REPOSITORY_NAME)}</dc:publisher>
        ${article.publication_date ? `<dc:date>${xml(article.publication_date)}</dc:date>` : ""}
        <dc:type>Text</dc:type>
        <dc:type>ScholarlyArticle</dc:type>
        <dc:format>text/html</dc:format>
        <dc:identifier>${xml(articleUrl)}</dc:identifier>
        ${doiUrl ? `<dc:identifier>${xml(doiUrl)}</dc:identifier>` : ""}
        <dc:language>${xml(article.language)}</dc:language>
        <dc:rights>Copyright and licensing information is available on the article page.</dc:rights>
      </oai_dc:dc>
    </metadata>
  </record>`;
}

async function listIdentifiers(requestUrl: string, set?: string | null) {
  const articles = await getPublishedArticles(set);
  if (articles.length === 0) {
    return errorResponse(
      requestUrl,
      "noRecordsMatch",
      "No published records match this request."
    );
  }

  return envelope(
    requestUrl,
    "ListIdentifiers",
    `<ListIdentifiers>
    ${articles.map(header).join("\n")}
  </ListIdentifiers>`
  );
}

async function listRecords(requestUrl: string, set?: string | null) {
  const articles = await getPublishedArticles(set);
  if (articles.length === 0) {
    return errorResponse(
      requestUrl,
      "noRecordsMatch",
      "No published records match this request."
    );
  }

  return envelope(
    requestUrl,
    "ListRecords",
    `<ListRecords>
    ${articles.map(record).join("\n")}
  </ListRecords>`
  );
}

async function getRecord(requestUrl: string, identifier: string | null) {
  const id = identifier?.split("/").at(-1);
  if (!id) {
    return errorResponse(requestUrl, "badArgument", "GetRecord requires an identifier.");
  }

  const articles = await getPublishedArticles();
  const article = articles.find((item) => item.id === id);
  if (!article) {
    return errorResponse(requestUrl, "idDoesNotExist", "Record does not exist.");
  }

  return envelope(requestUrl, "GetRecord", `<GetRecord>${record(article)}</GetRecord>`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const verb = url.searchParams.get("verb") ?? "Identify";
  const metadataPrefix = url.searchParams.get("metadataPrefix");
  const set = url.searchParams.get("set");
  const identifier = url.searchParams.get("identifier");

  let body: string;
  if (
    ["ListRecords", "ListIdentifiers", "GetRecord"].includes(verb) &&
    metadataPrefix !== "oai_dc"
  ) {
    body = errorResponse(
      request.url,
      "cannotDisseminateFormat",
      "Only metadataPrefix=oai_dc is supported."
    );
  } else if (verb === "Identify") {
    body = await identify(request.url);
  } else if (verb === "ListMetadataFormats") {
    body = listMetadataFormats(request.url);
  } else if (verb === "ListSets") {
    body = await listSets(request.url);
  } else if (verb === "ListIdentifiers") {
    body = await listIdentifiers(request.url, set);
  } else if (verb === "ListRecords") {
    body = await listRecords(request.url, set);
  } else if (verb === "GetRecord") {
    body = await getRecord(request.url, identifier);
  } else {
    body = errorResponse(request.url, "badVerb", "Unsupported OAI-PMH verb.");
  }

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
