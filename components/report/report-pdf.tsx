import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CONFIDENCE_LABEL, admiraltyCode } from "@/lib/report/admiralty";
import { measureRef } from "@/lib/nis2/mapping";
import type { ReportFull, Tlp } from "@/lib/report/types";

export type PdfMitigation = { external_id: string; name: string; techniques: number; measures: string[] };

// Helvetica standard (WinAnsi): niente frecce o simboli fuori dal Latin-1.
const TLP_COLOR: Record<Tlp, string> = { CLEAR: "#FFFFFF", GREEN: "#33FF00", AMBER: "#FFC000", "AMBER+STRICT": "#FFC000", RED: "#FF2B2B" };
const KIND = { attore: "Profilo attore", settore: "Analisi di settore", evento: "Evento" } as const;

const s = StyleSheet.create({
  page: { padding: 36, paddingTop: 44, paddingBottom: 44, fontSize: 9, fontFamily: "Helvetica", color: "#111", lineHeight: 1.35 },
  tlpBar: { position: "absolute", left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 8 },
  tlp: { backgroundColor: "#000", paddingHorizontal: 4, paddingVertical: 2, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { color: "#555", marginBottom: 10 },
  h2: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4, textTransform: "uppercase", color: "#333" },
  p: { marginBottom: 4 },
  example: { backgroundColor: "#FFF4CC", padding: 4, marginBottom: 8, fontSize: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 2 },
  muted: { color: "#666" },
  mono: { fontFamily: "Courier", fontSize: 8 },
  cols: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
});

function TlpBar({ tlp, top }: { tlp: Tlp; top: boolean }) {
  return (
    <View style={[s.tlpBar, top ? { top: 18 } : { bottom: 18 }]} fixed>
      <Text style={[s.tlp, { color: TLP_COLOR[tlp] }]}>TLP:{tlp}</Text>
      <Text style={s.muted} render={({ pageNumber, totalPages }) => `ThreatBrief - pagina ${pageNumber} di ${totalPages}`} />
    </View>
  );
}

function Header({ full, label }: { full: ReportFull; label: string }) {
  const r = full.report;
  return (
    <View>
      {r.is_example && <Text style={s.example}>ESEMPIO - contenuto dimostrativo del portfolio ThreatBrief, non un prodotto di intelligence reale.</Text>}
      <Text style={s.title}>{r.title}</Text>
      <Text style={s.meta}>
        {label} - {KIND[r.kind]}: {full.subject.label} - {new Date(r.published_at ?? r.updated_at).toLocaleDateString("it-IT")} - confidenza complessiva {CONFIDENCE_LABEL[r.confidence]}
        {r.exec_risk ? ` - rischio ${r.exec_risk}` : ""}
      </Text>
    </View>
  );
}

function StatementsPdf({ full, section }: { full: ReportFull; section: "executive" | "tecnica" }) {
  const items = full.statements.filter((x) => x.section === section);
  if (!items.length) return null;
  const n = new Map(full.sources.map((x, i) => [x.id, i + 1]));
  return (
    <View style={s.cols}>
      <View style={s.col}>
        <Text style={s.h2}>Fatti (da fonte)</Text>
        {items.filter((x) => x.kind === "fatto").map((f) => (
          <Text key={f.id} style={s.p}>- {f.body} [{n.get(f.source_id ?? "")}]</Text>
        ))}
      </View>
      <View style={s.col}>
        <Text style={s.h2}>Valutazioni (analista)</Text>
        {items.filter((x) => x.kind === "valutazione").map((a) => (
          <Text key={a.id} style={s.p}>- [confidenza {a.confidence ? CONFIDENCE_LABEL[a.confidence] : "?"}] {a.body}</Text>
        ))}
      </View>
    </View>
  );
}

function SourcesPdf({ full }: { full: ReportFull }) {
  return (
    <View>
      <Text style={s.h2}>Fonti (codice Admiralty)</Text>
      {full.sources.map((x, i) => (
        <Text key={x.id} style={[s.p, { fontSize: 8 }]}>
          [{i + 1}] {admiraltyCode(x.reliability, x.credibility)} - {x.title}
          {x.publisher ? ` (${x.publisher})` : ""}
          {x.url ? <Link src={x.url}> {x.url}</Link> : null}
        </Text>
      ))}
    </View>
  );
}

export function ReportPdf({ full, mode, mitigations }: { full: ReportFull; mode: "brief" | "tecnica"; mitigations: PdfMitigation[] }) {
  const r = full.report;
  return (
    <Document title={r.title} author="ThreatBrief" subject={`TLP:${r.tlp}`} language="it">
      <Page size="A4" style={s.page}>
        <TlpBar tlp={r.tlp} top />
        <TlpBar tlp={r.tlp} top={false} />
        {mode === "brief" ? (
          <>
            <Header full={full} label="Brief esecutivo" />
            <Text style={s.h2}>In sintesi</Text>
            <Text style={s.p}>{r.exec_summary}</Text>
            {r.exec_impact && (
              <>
                <Text style={s.h2}>Impatto per l&apos;organizzazione</Text>
                <Text style={s.p}>{r.exec_impact}</Text>
              </>
            )}
            <StatementsPdf full={full} section="executive" />
            {r.exec_actions.length > 0 && (
              <>
                <Text style={s.h2}>Azioni consigliate</Text>
                {r.exec_actions.map((a, i) => <Text key={a} style={s.p}>{i + 1}. {a}</Text>)}
              </>
            )}
            <SourcesPdf full={full} />
          </>
        ) : (
          <>
            <Header full={full} label="Scheda tecnica" />
            <StatementsPdf full={full} section="tecnica" />
            <Text style={s.h2}>Tecniche ATT&amp;CK ({full.techniques.length})</Text>
            {full.techniques.map((t) => (
              <View key={t.id} style={s.row} wrap={false}>
                <Text style={[s.mono, { width: 60 }]}>{t.external_id}</Text>
                <Text style={{ width: 150 }}>{t.name}</Text>
                <Text style={[s.muted, { flex: 1 }]}>{t.note ?? "-"}</Text>
              </View>
            ))}
            {mitigations.length > 0 && (
              <>
                <Text style={s.h2}>Mitigazioni prioritarie e misure NIS2 (D.Lgs. 138/2024)</Text>
                {mitigations.map((m) => (
                  <View key={m.external_id} style={s.row} wrap={false}>
                    <Text style={[s.mono, { width: 40 }]}>{m.external_id}</Text>
                    <Text style={{ width: 170 }}>{m.name}</Text>
                    <Text style={[s.muted, { width: 70 }]}>{m.techniques} tecniche</Text>
                    <Text style={[s.muted, { flex: 1 }]}>{m.measures.map(measureRef).join("; ") || "-"}</Text>
                  </View>
                ))}
                <Text style={[s.muted, { fontSize: 7, marginTop: 2 }]}>Abbinamento ATT&amp;CK - NIS2: valutazione del progetto, non tabella ufficiale ACN.</Text>
              </>
            )}
            <Text style={s.h2}>Indicatori di compromissione ({full.iocs.length})</Text>
            {full.iocs.map((i) => (
              <View key={i.id} style={s.row} wrap={false}>
                <Text style={[s.mono, { width: 50, textTransform: "uppercase" }]}>{i.type}</Text>
                <Text style={[s.mono, { flex: 1 }]}>{i.value}</Text>
              </View>
            ))}
            {r.tech_notes && (
              <>
                <Text style={s.h2}>Note tecniche</Text>
                <Text style={s.p}>{r.tech_notes}</Text>
              </>
            )}
            <SourcesPdf full={full} />
          </>
        )}
      </Page>
    </Document>
  );
}
