import { writeFileSync } from "fs";
import { join } from "path";

const site = "https://english-tutor-mexico.pages.dev";
const dist = join(import.meta.dirname, "..", "dist");

const pages = [
  { path: "", priority: 1.0 },
  { path: "about", priority: 0.8 },
  { path: "pricing", priority: 0.9 },
  { path: "book", priority: 0.9 },
  { path: "gracias", priority: 0.3 },
  { path: "privacy", priority: 0.3 },
];

const today = new Date().toISOString().split("T")[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

// Root = Spanish homepage
xml += `  <url>\n    <loc>${site}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

// Spanish pages
for (const page of pages) {
  if (page.path === "") continue;
  const loc = `${site}/es/${page.path}/`;
  xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
}

// English pages
for (const page of pages) {
  const loc = page.path ? `${site}/en/${page.path}/` : `${site}/en/`;
  xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
}

xml += `</urlset>\n`;

writeFileSync(join(dist, "sitemap.xml"), xml);
console.log("Generated sitemap.xml with", (pages.length * 2 + 1), "URLs");
