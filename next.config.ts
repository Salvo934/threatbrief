import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components disattivati: su Cloudflare Workers (OpenNext 1.20) il rendering si blocca
  // (setTimeout del runtime, vedi opennextjs-cloudflare#1318). Tutte le pagine sono dinamiche
  // (force-dynamic nel layout), quindi i dati sono sempre letti a ogni richiesta.
  turbopack: {
    // La home contiene un altro package-lock.json: fissiamo la root sul progetto.
    root: import.meta.dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
