export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface text-xs text-muted">
      <div className="mx-auto w-full max-w-[1400px] space-y-1 px-4 py-4 sm:px-6">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a className="underline" href="/fonti">Fonti e stato della raccolta</a>
          <a className="underline" href="/qualita">Qualità dei dati</a>
          <a className="underline" href="/taxii2/">Server TAXII 2.1</a>
          <a className="underline" href="/briefs/rss.xml">Feed RSS</a>
          <a className="underline" href="/competenze">Cosa dimostra</a>
        </p>
        <p>
          Dati:{" "}
          <a className="underline" href="https://attack.mitre.org/" target="_blank" rel="noreferrer">
            MITRE ATT&CK®
          </a>{" "}
          (© The MITRE Corporation, riprodotto secondo i{" "}
          <a className="underline" href="https://attack.mitre.org/resources/legal-and-branding/terms-of-use/" target="_blank" rel="noreferrer">
            termini d&apos;uso
          </a>
          ) ·{" "}
          <a className="underline" href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noreferrer">
            CISA KEV
          </a>
          .
        </p>
        <p>
          Gli attributi marcati <em>derivato</em> sono estratti automaticamente dalle descrizioni ATT&CK e vanno
          verificati: non sono valutazioni dell&apos;analista.
        </p>
      </div>
    </footer>
  );
}
