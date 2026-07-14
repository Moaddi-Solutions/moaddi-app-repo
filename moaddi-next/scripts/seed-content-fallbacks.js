const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dbPath = path.join(root, "data", "db.json");

function readFallback(filePath, constName) {
  const source = fs.readFileSync(filePath, "utf8");
  const start = source.indexOf(`const ${constName} = `);
  if (start < 0) throw new Error(`Could not find ${constName}`);

  const objectStart = source.indexOf("{", start);
  let depth = 0;
  for (let i = objectStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return vm.runInNewContext(`(${source.slice(objectStart, i + 1)})`);
    }
  }
  throw new Error(`Could not parse ${constName}`);
}

const heroFallback = readFallback(
  path.join(root, "app", "(root)", "components", "blocks", "Hero.jsx"),
  "HERO_FALLBACK",
);
const storeUrlsFallback = readFallback(
  path.join(root, "app", "(root)", "components", "blocks", "Hero.jsx"),
  "STORE_URLS_FALLBACK",
);
const footerFallback = readFallback(
  path.join(root, "app", "(root)", "components", "Footer.jsx"),
  "FOOTER_FALLBACK",
);
const siteMetaFallback = readFallback(
  path.join(root, "app", "(root)", "layout.jsx"),
  "SITE_META_FALLBACK",
);
const headerFallback = readFallback(
  path.join(root, "app", "(root)", "components", "Header.jsx"),
  "FALLBACK_NAV_ITEMS",
);

const locales = ["en", "ar", "zh", "it"];
const wantedHeaderHrefs = new Set(["/", "/shops", "/machines"]);
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));

for (const locale of locales) {
  const hero = heroFallback[locale] ?? heroFallback.en;
  const footer = footerFallback[locale] ?? footerFallback.en;
  const siteMeta = siteMetaFallback[locale] ?? siteMetaFallback.en;
  const header = headerFallback[locale] ?? headerFallback.en;

  const heroBlock = {
    id: "Hero",
    __typename: "ComponentComponentsHero",
    order: 1,
    ...hero,
  };

  const homeKey = `${locale}HomeBlocks`;
  const existingBlocks = Array.isArray(db[homeKey]) ? db[homeKey] : [];
  const restBlocks = existingBlocks.filter((block) => block?.id !== "Hero");
  db[homeKey] = [heroBlock, ...restBlocks];

  db[`${locale}HeaderLinks`] = header
    .filter(({ href }) => wantedHeaderHrefs.has(href))
    .map(({ title, href }, index) => ({
      id: String(index + 1),
      __typename: "ComponentFooterLinks",
      title,
      url: href,
      type: 1,
      category: null,
      subCategory: null,
      icon: null,
      article: null,
    }));

  db[`${locale}FooterBody`] = {
    id: "fortis",
    title: footer.title,
    body: footer.body,
    links: footer.links,
  };

  db[`${locale}Site`] = {
    ...db[`${locale}Site`],
    id: db[`${locale}Site`]?.id ?? "fortis",
    name: siteMeta.title,
    description: siteMeta.description,
  };

  db[`${locale}Seo`] = {
    ...db[`${locale}Seo`],
    id: db[`${locale}Seo`]?.id ?? "fortis",
    __typename: db[`${locale}Seo`]?.__typename ?? "ComponentSharedSeo",
    metaTitle: siteMeta.title,
    metaDescription: siteMeta.description,
  };
}

// Store links are locale-independent — seeded once onto the shared "site" entry.
db.site = { ...db.site, ...storeUrlsFallback };

fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);
