import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Nessuna cache incrementale: i dati sono letti a ogni richiesta (Cache Components senza "use cache"),
// così non servono KV/R2 e restiamo nel piano gratuito.
export default defineCloudflareConfig();
