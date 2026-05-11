import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://english-tutor-mexico.pages.dev",
  output: "static",
  integrations: [
    sitemap({
      changefreq: "weekly",
      priority: 1.0,
      lastmod: new Date(),
    }),
  ],
});
