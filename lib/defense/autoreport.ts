import type { SupabaseClient } from "@supabase/supabase-js";
import { rankMitigations, type MitigatesLink } from "../attack/mitigations";
import { mitigationIt } from "../i18n/attack-it";
import { slugify } from "../report/validate";
import { aiEnabled, draftAdvisoryWithAi } from "../ai/claude";
import { validateAdvisoryAi, type AdvisoryAi } from "../ai/guard";
import { mergeAiDraft } from "./ai-draft";
import { fetchCisaAdvisories } from "./cisa-feed";
import { composeDraft, executiveSummary, type Reason } from "./rules";

// Import relativi (niente alias "@/"): questo modulo è usato dallo script di ingestion.

type Alert = {
  id: string; intel_item_id: number; reasons: string[]; actors: { external_id: string; name: string; alias: string }[];
  technique_ids: string[]; cves: string[];
};

async function q<T>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data as T;
}

async function allRows<T>(make: (f: number, t: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string) {
  const out: T[] = [];
  for (let f = 0; ; f += 1000) {
    const page = await q<T[]>(make(f, f + 999), what);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

const toReason = (s: string): Reason => {
  const [label, ...rest] = s.split(" — ");
  return { label, evidence: rest.join(" — ").replace(/^«|»$/g, "") };
};

/**
 * Per ogni avviso «difesa» senza report crea una bozza completa (fatti con fonte, tecniche,
 * azioni, D3FEND) intestata all'analista. La pubblicazione resta una scelta dell'analista.
 */
export async function generateDefenseDrafts(db: SupabaseClient) {
  const alerts = await q<Alert[]>(
    db.from("defense_alerts").select("id, intel_item_id, reasons, actors, technique_ids, cves").is("report_id", null).order("detected_at"),
    "avvisi senza report",
  );
  if (!alerts.length) return 0;

  const analyst = await q<{ user_id: string } | null>(db.from("analysts").select("user_id").order("created_at").limit(1).maybeSingle(), "analista");
  if (!analyst) throw new Error("nessun analista registrato: impossibile intestare le bozze");

  const [mitigations, links] = await Promise.all([
    allRows<{ id: string; external_id: string; name: string }>((f, t) => db.from("attack_mitigations").select("id, external_id, name").eq("deprecated", false).order("id").range(f, t), "mitigazioni"),
    allRows<MitigatesLink>((f, t) => db.from("v_technique_mitigations").select("mitigation_id, technique_id").order("mitigation_id").order("technique_id").range(f, t), "relazioni mitigazioni"),
  ]);

  // IA facoltativa: serve il testo completo dell'avviso (nel DB ne salviamo solo l'inizio).
  const useAi = aiEnabled();
  let fullText = new Map<string, string>();
  let validTechniques = new Map<string, string>(); // external_id → id STIX
  if (useAi) {
    try {
      fullText = new Map((await fetchCisaAdvisories()).map((x) => [x.url, x.text]));
    } catch (err) {
      console.warn(`  IA: testo degli avvisi non disponibile (${err instanceof Error ? err.message : err}), bozze senza IA`);
    }
    const all = await allRows<{ id: string; external_id: string }>(
      (f, t) => db.from("attack_techniques").select("id, external_id").eq("revoked", false).eq("deprecated", false).order("id").range(f, t),
      "tecniche ATT&CK",
    );
    validTechniques = new Map(all.map((t) => [t.external_id, t.id]));
  } else {
    console.log("  IA non configurata (ANTHROPIC_API_KEY assente): bozze a modello");
  }

  let created = 0;
  for (const a of alerts) {
    const item = await q<{ title: string; url: string; published_at: string; summary: string | null }>(
      db.from("intel_items").select("title, url, published_at, summary").eq("id", a.intel_item_id).single(),
      "avviso",
    );
    const techs = a.technique_ids.length
      ? await q<{ id: string; external_id: string }[]>(
          db.from("attack_techniques").select("id, external_id").in("external_id", a.technique_ids).eq("revoked", false).eq("deprecated", false),
          "tecniche",
        )
      : [];
    const techNotes = new Map(techs.map((t) => [t.id, "Citata nell'avviso"]));

    let ai: AdvisoryAi | null = null;
    const text = fullText.get(item.url);
    if (useAi && text) {
      const date = new Date(item.published_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
      const res = await draftAdvisoryWithAi({ title: item.title, date, text });
      if (res.ok) {
        ai = validateAdvisoryAi(res.value, text, new Set(validTechniques.keys()));
        if (!ai) console.warn(`  IA: «${item.title}» scartata dai controlli, bozza a modello`);
      } else {
        console.warn(`  IA: «${item.title}» non disponibile (${res.reason}), bozza a modello`);
      }
    }
    // Tecniche descritte a parole e trovate dall'IA (con citazione verificata).
    for (const t of ai?.techniques ?? []) {
      const id = validTechniques.get(t.id);
      if (id && !techNotes.has(id)) {
        techs.push({ id, external_id: t.id });
        techNotes.set(id, `Descritta nell'avviso, individuata con IA: «${t.quote}»`);
      }
    }
    const kev = a.cves.length
      ? await q<{ cve_id: string; known_ransomware_use: boolean }[]>(db.from("kev_vulnerabilities").select("cve_id, known_ransomware_use").in("cve_id", a.cves), "KEV")
      : [];
    const kevMap = new Map(kev.map((k) => [k.cve_id, k.known_ransomware_use]));
    const ranked = rankMitigations(mitigations, links, new Map(techs.map((t) => [t.id, 1]))).slice(0, 3);
    const d3 = techs.length
      ? await q<{ d3fend_id: string; label: string; tactic: string; attack_external_id: string }[]>(
          db.from("d3fend_countermeasures").select("d3fend_id, label, tactic, attack_external_id").in("attack_external_id", techs.map((t) => t.external_id)),
          "D3FEND",
        )
      : [];
    // D3FEND: le contromisure che coprono più tecniche dell'avviso, al massimo 6.
    const d3Count = new Map<string, { label: string; tactic: string; n: number }>();
    for (const r of d3) {
      const e = d3Count.get(r.d3fend_id) ?? { label: r.label, tactic: r.tactic, n: 0 };
      e.n++;
      d3Count.set(r.d3fend_id, e);
    }

    const draft = composeDraft({
      advisory: { title: item.title, url: item.url, published_at: item.published_at, summaryEn: executiveSummary(item.summary ?? "") },
      reasons: a.reasons.map(toReason),
      actors: a.actors,
      techniqueCount: techs.length,
      cves: a.cves.map((id) => ({ id, kev: kevMap.has(id), ransomware: kevMap.get(id) === true })),
      mitigations: ranked.map((r) => ({ external_id: r.mitigation.external_id, name: mitigationIt(r.mitigation.external_id, r.mitigation.name), techniques: r.techniques })),
      d3fend: [...d3Count.values()].sort((x, y) => y.n - x.n || x.label.localeCompare(y.label)).slice(0, 6),
    });

    const finalDraft = ai ? mergeAiDraft(draft, ai, a.cves.filter((c) => kevMap.has(c))) : draft;

    const subjectGroup = a.actors.length === 1
      ? await q<{ id: string } | null>(db.from("attack_groups").select("id").eq("external_id", a.actors[0].external_id).limit(1).maybeSingle(), "gruppo")
      : null;
    const title = `Avviso CISA: ${item.title}`.slice(0, 200);
    const report = await q<{ id: string }>(
      db.from("reports").insert({
        owner_id: analyst.user_id,
        slug: `${item.published_at.slice(0, 10)}-${slugify(item.title)}`.slice(0, 90).replace(/-+$/, ""),
        title,
        kind: subjectGroup ? "attore" : "evento",
        subject_group_id: subjectGroup?.id ?? null,
        subject_event: subjectGroup ? null : item.title,
        tlp: "CLEAR",
        confidence: "medio",
        status: "draft",
        exec_risk: finalDraft.risk,
        exec_summary: finalDraft.summary,
        exec_impact: finalDraft.impact,
        exec_actions: finalDraft.actions,
        tech_notes: finalDraft.tech_notes,
        auto_generated: true,
        ai_assisted: ai !== null,
      }).select("id").single(),
      "report",
    );
    const source = await q<{ id: string }>(
      db.from("report_sources").insert({
        report_id: report.id, title: item.title, url: item.url, publisher: "CISA e agenzie partner", reliability: "A", credibility: 2,
      }).select("id").single(),
      "fonte",
    );
    await q(db.from("report_statements").insert(
      finalDraft.statements.map((s, position) => ({
        report_id: report.id, section: s.section, kind: s.kind, body: s.body, position,
        source_id: s.kind === "fatto" ? source.id : null,
        confidence: "confidence" in s ? s.confidence : null,
      })),
    ), "fatti e valutazioni");
    if (techs.length) {
      await q(db.from("report_techniques").insert(techs.map((t) => ({ report_id: report.id, technique_id: t.id, note: techNotes.get(t.id) ?? null }))), "tecniche del report");
    }
    await q(db.from("defense_alerts").update({ report_id: report.id }).eq("id", a.id), "collegamento avviso-report");
    console.log(`  bozza «${item.title}»${ai ? ` scritta con IA (${ai.facts.length} fatti, ${ai.techniques.length} tecniche, ${ai.rejected} proposte scartate)` : " a modello"}`);
    created++;
  }
  return created;
}
