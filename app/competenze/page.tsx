import { CheckCircle2, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Cosa dimostra",
  description: "I requisiti degli annunci per analisti di Cyber Threat Intelligence e dove ThreatBrief li dimostra.",
};

/**
 * Requisiti ricorrenti negli annunci CTI (es. Accenture «Cyber Threat Intelligence Expert», Italia,
 * e analisi di annunci 2026) → la pagina che li dimostra. Nessuna affermazione senza link.
 */
const ROWS: { req: string; where: { label: string; href: string }[]; how: string }[] = [
  {
    req: "MITRE ATT&CK",
    where: [{ label: "Scheda Akira", href: "/minacce/akira" }, { label: "Profilo Sandworm", href: "/attori/G0034" }, { label: "Confronto tra attori", href: "/matrice?a=G0007&b=G0034" }],
    how: "Tecniche per fase dell'attacco, procedure documentate, heatmap e confronto tra due attori con indice di Jaccard. ATT&CK v20.1 aggiornato ogni settimana.",
  },
  {
    req: "MITRE D3FEND",
    where: [{ label: "Scheda Qilin", href: "/minacce/qilin" }, { label: "Profilo APT28", href: "/attori/G0007" }],
    how: "Per ogni attore, le contromisure difensive D3FEND (rafforzare, rilevare, isolare…) ordinate per quante tecniche coprono, dall'API ufficiale MITRE.",
  },
  {
    req: "Minacce alla difesa e all'aerospazio; automazione del ciclo di intelligence",
    where: [{ label: "Difesa e aerospazio", href: "/minacce/difesa" }, { label: "La notte nel mondo", href: "/minacce/notte" }],
    how: "Ogni 6 ore legge gli avvisi ufficiali CISA e partner, rileva quelli sulla filiera della difesa (con la frase che lo giustifica), correla attori, tecniche e CVE sfruttate e prepara da solo una bozza di report che l'analista verifica e pubblica in PDF, STIX e TAXII.",
  },
  {
    req: "OSINT e pivoting sull'infrastruttura",
    where: [{ label: "Indagine OSINT (area analista)", href: "/osint" }],
    how: "Indagine passiva su domini, IP, URL e hash da fonti aperte (RDAP, DNS, Certificate Transparency, Shodan InternetDB) e dal database interno: segnali motivati, giudizio con Admiralty, pivot cliccabili e un registro riproducibile (CSV, JSON, STIX) con ora di consultazione di ogni fonte. Triage di liste con raggruppamento in campagne (stesso IP, name server, marchio, registrazione, malware) e note scritte con IA verificate sui dati. Solo infrastruttura, mai persone.",
  },
  {
    req: "Detection engineering (regole Sigma)",
    where: [{ label: "Regole del report Cobalt Strike", href: "/briefs/esempio-cobalt-strike-c2?vista=tecnica" }],
    how: "Dalle tecniche ATT&CK di un report l'IA propone regole Sigma come dati strutturati; il codice le controlla (tecnica del report, sorgente di log nota, condizione che cita solo selezioni esistenti, nessuna chiave ripetuta, nessun IP o hash inventato) e scrive lo YAML. Pubblicate come «experimental», da testare sui propri log.",
  },
  {
    req: "Uso responsabile dell'IA nell'analisi",
    where: [{ label: "Chiedi a ThreatBrief (area analista)", href: "/assistente" }],
    how: "Domande in italiano sui dati dell'app: l'assistente usa solo strumenti di lettura e cita le fonti. Un controllo automatico verifica che ogni numero compaia nei dati consultati e che ogni citazione rimandi a una fonte reale; se non torna la risposta viene corretta o segnalata.",
  },
  {
    req: "Valutazione delle fonti e controllo di qualità dei dati",
    where: [{ label: "Qualità dei dati", href: "/qualita" }, { label: "Fonti", href: "/fonti" }],
    how: "Ogni settimana un campione casuale dei dati (CVE, tecniche ATT&CK, rivendicazioni, indicatori, citazioni dei report, avvisi) viene ricontrollato sulle fonti originali; il risultato è pubblico, anomalie comprese, con il link per la verifica manuale.",
  },
  {
    req: "Corroborazione tra fonti e valutazione dell'affidabilità (Admiralty)",
    where: [{ label: "Difesa e aerospazio", href: "/minacce/difesa" }],
    how: "L'agente investigatore confronta l'avviso con altre fonti autorizzate e consegna un dossier: ogni affermazione è ricontrollata sulla pagina citata e il codice Admiralty è calcolato (affidabilità dell'editore, credibilità dal numero di fonti indipendenti), non scelto dall'IA.",
  },
  {
    req: "Analisi delle TTP e profili degli attori",
    where: [{ label: "Minacce principali", href: "/minacce" }],
    how: "Classifica dei gruppi più attivi contro organizzazioni italiane e schede in italiano costruite solo su fonti primarie (MITRE, avvisi CISA/FBI), con le lacune dichiarate.",
  },
  {
    req: "Raccolta e correlazione da più fonti, OSINT",
    where: [{ label: "Fonti", href: "/fonti" }, { label: "Analizza", href: "/analisi" }],
    how: "Otto fonti aperte (ATT&CK, D3FEND, CISA KEV, ThreatFox, URLhaus, OTX, CSIRT Italia, ransomware.live), IOC deduplicati tra le fonti e collegati a malware e attori.",
  },
  {
    req: "Triage degli IOC",
    where: [{ label: "Analizza", href: "/analisi" }],
    how: "Incolli un testo o una lista (anche defanged): stato di ogni indicatore (nuovo, già visto, collegato), CVE nel catalogo KEV, tecniche e software citati.",
  },
  {
    req: "Report utilizzabili, per tutti i livelli",
    where: [{ label: "Report: Sandworm", href: "/briefs/esempio-sandworm-energia" }, { label: "Tutti i report", href: "/briefs" }],
    how: "Brief esecutivo di una pagina e scheda tecnica; TLP 2.0, codice Admiralty sulle fonti, fatti separati dalle valutazioni con livello di confidenza; PDF.",
  },
  {
    req: "Riassunti giornalieri e settimanali",
    where: [{ label: "Briefing", href: "/briefing" }],
    how: "Ogni mattina una bozza automatica (KEV, CSIRT Italia, rivendicazioni, IOC); l'analista sceglie le priorità, scrive «perché conta» e «cosa fare» e pubblica al massimo 5 punti.",
  },
  {
    req: "STIX 2.1 e TAXII 2.1",
    where: [{ label: "Server TAXII", href: "/taxii2/" }, { label: "STIX di un report", href: "/briefs/esempio-cobalt-strike-c2/stix" }],
    how: "Bundle STIX 2.1 validati con il validatore ufficiale OASIS, marking TLP 2.0 ufficiali; server TAXII 2.1 in sola lettura verificato con il client OASIS (taxii2-client), utilizzabile da OpenCTI o MISP.",
  },
  {
    req: "Automazione dei processi di intelligence",
    where: [{ label: "Fonti e stato della raccolta", href: "/fonti" }, { label: "Codice su GitHub", href: "https://github.com/Salvo934/threatbrief" }],
    how: "Pipeline su GitHub Actions: feed ogni 6 ore, ATT&CK e D3FEND ogni settimana, digest ogni mattina; ogni fonte isolata, errori visibili, IOC eliminati dopo 90 giorni.",
  },
  {
    req: "Tradurre la minaccia in rischio e azioni (anche normative)",
    where: [{ label: "Settore sanità", href: "/settori/sanita" }, { label: "Mitigazioni e NIS2", href: "/mitigazioni" }],
    how: "Per ogni settore: attori, tecniche più usate e mitigazioni prioritarie collegate alle misure dell'art. 24 del D.Lgs. 138/2024 (NIS2).",
  },
  {
    req: "Sicurezza e qualità",
    where: [{ label: "README e codice", href: "https://github.com/Salvo934/threatbrief" }],
    how: "RLS su ogni tabella, nessuna chiave segreta nell'app (controllo automatico prima del deploy), test automatici, CI su ogni modifica.",
  },
];

const TOUR = [
  { t: "Briefing", href: "/", d: "Cosa è successo e cosa fare, in cinque punti." },
  { t: "Minacce → Akira", href: "/minacce/akira", d: "Come entra, cosa usa, tecniche ATT&CK e contromisure D3FEND." },
  { t: "Analizza", href: "/analisi", d: "«Carica testo di esempio» → Analizza: triage degli IOC in un clic." },
  { t: "Report → Sandworm", href: "/briefs/esempio-sandworm-energia", d: "Brief esecutivo e scheda tecnica, poi il PDF." },
  { t: "TAXII", href: "/taxii2/", d: "Gli stessi report, consumabili da una piattaforma TIP." },
];

export default function CompetenzePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Cosa dimostra ThreatBrief">
        I requisiti che ricorrono negli annunci per analisti di Cyber Threat Intelligence e, per ciascuno, la pagina dove vederlo
        all&apos;opera. Ogni voce è verificabile con un clic.
      </PageHeader>

      <Card title="Il giro in 2 minuti">
        <ol className="grid gap-2 sm:grid-cols-5">
          {TOUR.map((s, i) => (
            <li key={s.t}>
              <Link href={s.href} className="flex h-full flex-col rounded-md border border-line p-3 hover:border-accent">
                <span className="text-xs text-muted">{i + 1}</span>
                <span className="font-medium">{s.t}</span>
                <span className="mt-1 text-xs text-muted">{s.d}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Requisito negli annunci</th>
              <th className="px-4 py-2 font-medium">Come lo dimostra</th>
              <th className="px-4 py-2 font-medium">Dove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {ROWS.map((r) => (
              <tr key={r.req}>
                <td className="px-4 py-3 font-medium">
                  <span className="inline-flex items-start gap-1.5"><CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />{r.req}</span>
                </td>
                <td className="px-4 py-3 text-muted">{r.how}</td>
                <td className="px-4 py-3">
                  <ul className="space-y-1">
                    {r.where.map((w) => (
                      <li key={w.href}>
                        {w.href.startsWith("http") ? (
                          <a href={w.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap text-accent hover:underline">
                            {w.label} <ExternalLink aria-hidden className="size-3" />
                          </a>
                        ) : (
                          <Link href={w.href} className="whitespace-nowrap text-accent hover:underline">{w.label} →</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Requisiti ricavati da annunci pubblici per ruoli CTI, tra cui{" "}
        <a href="https://www.accenture.com/us-en/careers/jobdetails?id=R00286660_it&title=Cyber+Threat+Intelligence+Expert" target="_blank" rel="noreferrer" className="underline">
          Accenture, «Cyber Threat Intelligence Expert» (Italia)
        </a>{" "}
        e una{" "}
        <a href="https://feedly.com/ti-essentials/posts/the-cti-career-guide-roles-skills-and-salaries" target="_blank" rel="noreferrer" className="underline">
          rassegna di annunci 2026
        </a>
        . Progetto personale di portfolio: i dati sono reali e pubblici, i contenuti dimostrativi sono marcati «esempio».
      </p>
    </div>
  );
}
