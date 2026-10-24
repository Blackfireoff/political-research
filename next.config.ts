import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Paquets lourds ou s'appuyant sur des fichiers annexes : chargés tels quels par Node.
  serverExternalPackages: ["unpdf", "linkedom", "@mozilla/readability", "rss-parser"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
