import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Ogni pagina legge dati aggiornati (feed, sessione): mai HTML generato una volta alla build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "ThreatBrief", template: "%s · ThreatBrief" },
  description:
    "Piattaforma di Cyber Threat Intelligence: raccolta, analisi, produzione e diffusione di intelligence sulle minacce per i settori italiani.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans lg:flex">
        <SiteHeader />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
