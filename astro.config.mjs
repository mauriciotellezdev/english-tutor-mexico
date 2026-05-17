import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://english-tutor-mexico.pages.dev",
  output: "static",
  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
});
