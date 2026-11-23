import { AlertTriangle, ArrowLeft, BookMarked, ShieldCheck, Swords, Target, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Blocks } from "@/components/academy/rich-text";
import { D3fendPanel } from "@/components/d3fend/d3fend-panel";
import { MeasureBadges } from "@/components/nis2/measure-badges";
import { VictimsChart } from "@/components/ransomware/victims-chart";
import { Badge, Card, Skeleton, Stat } from "@/components/ui/primitives";
import { getProfileData } from "@/lib/data/threats";
import { formatDate, formatNumber } from "@/lib/format";
import { mitigationIt, tacticIt } from "@/lib/i18n/attack-it";
import { victimsByMonth } from "@/lib/ransomware-stats";
import { getProfile, type ThreatProfile } from "@/lib/threats/profiles";

type Props = PageProps<"/minacce/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProfile((await params).slug);
  return { title: p ? `${p.name} · Minacce principali` : "Minacce principali" };
}

export default async function ProfilePage({ params }: Props) {
  const profile = getProfile((await params).slug);
  if (!profile) notFound();
  return (
    <article className="space-y-6">
      <div className="space-y-2">
        <Link href="/minacce" className="inline-flex items-center gap-1 text-sm text-muted hover:underline">
          <ArrowLeft aria-hidden className="size-3.5" /> Minacce principali
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{profile.name}</h1>
        {profile.aliases.length > 0 && <p className="text-sm text-muted">Conosciuto anche come: {profile.aliases.join(", ")}</p>}
        <p className="max-w-3xl">{profile.inShort}</p>
      </div>

      {profile.caveat && (
        <div className="flex gap-2 rounded-md border-l-2 border-warn-text bg-warn-bg px-3 py-2 text-sm text-warn-text">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" /> {profile.caveat}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title={<span className="inline-flex items-center gap-2"><Swords aria-hidden className="size-4 text-err" />Chi è e come attacca</span>} className="lg:col-span-3">
          <Blocks blocks={profile.howItWorks} />
        </Card>
        <Card title={<span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden className="size-4 text-ok" />Contromisure specifiche</span>} className="lg:col-span-2">
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {profile.countermeasures.map((c) => <li key={c}><Blocks blocks={[c]} /></li>)}
          </ul>
        </Card>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px]" />}>
        <LiveData profile={profile} />
      </Suspense>

      <Card title={<span className="inline-flex items-center gap-2"><BookMarked aria-hidden className="size-4 text-accent" />Fonti</span>}>
        <ul className="space-y-1.5 text-sm">
          {profile.sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{s.title}</a></li>
          ))}
          <li className="text-muted">Rivendicazioni: ransomware.live (dichiarazioni dei gruppi, non verificate).</li>
        </ul>
        <p className="mt-3 text-xs text-muted">
          Testi in italiano: sintesi e traduzioni del progetto ThreatBrief delle fonti indicate. Le tecniche e le contromisure
          prioritarie sono calcolate dalle relazioni di MITRE ATT&CK.
        </p>
      </Card>
    </article>
  );
}

async function LiveData({ profile }: { profile: ThreatProfile }) {
  await connection();
  const today = new Date();
  const d = await getProfileData(profile, today);

  return (
    <>
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Target aria-hidden className="size-5 text-accent" />Cosa colpisce in Italia</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Rivendicazioni · 12 mesi" value={formatNumber(d.current)} hint={`dal ${formatDate(d.since12)}`} />
          <Stat label="12 mesi precedenti" value={formatNumber(d.previous)} />
          <Stat label="Tecniche documentate" value={formatNumber(d.techniqueCount)} hint="MITRE ATT&CK" />
          <Stat label="Settore più colpito" value={<span className="text-lg">{d.sectors[0]?.[0] ?? "—"}</span>} hint="classificazione di ransomware.live" />
        </div>
        {d.claims.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-5">
            <Card title="Rivendicazioni per mese (24 mesi)" className="lg:col-span-3">
              <VictimsChart data={victimsByMonth(d.claims, today, 24)} label={`Rivendicazioni di ${profile.name} contro organizzazioni italiane per mese`} />
            </Card>
            <Card title="Settori (12 mesi)" className="lg:col-span-2">
              <ul className="space-y-1.5 text-sm">
                {d.sectors.map(([s, n]) => (
                  <li key={s} className="flex justify-between gap-3"><span>{s}</span><span className="tabular-nums text-muted">{n}</span></li>
                ))}
                {!d.sectors.length && <li className="text-muted">Nessuna rivendicazione negli ultimi 12 mesi.</li>}
              </ul>
            </Card>
          </div>
        ) : (
          <p className="text-sm text-muted">Nessuna rivendicazione contro organizzazioni italiane negli ultimi 24 mesi nei dati raccolti.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Wrench aria-hidden className="size-5 text-accent" />Cosa usa: le tecniche per fase dell&apos;attacco</h2>
        <p className="text-sm text-muted">
          Tecniche documentate da MITRE ATT&CK per{" "}
          {[...d.attackGroups.map((g) => <Link key={g.external_id} href={`/attori/${g.external_id}`} className="text-accent hover:underline">{g.name} ({g.external_id})</Link>)]}
          {d.attackGroups.length > 0 && d.attackSoftware.length > 0 && " e "}
          {d.attackSoftware.map((s, i) => (
            <span key={s.external_id}>
              {i > 0 && ", "}
              <a href={`https://attack.mitre.org/software/${s.external_id}/`} target="_blank" rel="noreferrer" className="text-accent hover:underline">{s.name} ({s.external_id})</a>
            </span>
          ))}
          . Nomi delle fasi in italiano, nomi delle tecniche nell&apos;originale.
        </p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {d.byTactic.map((t) => (
            <div key={t.externalId} className="rounded-lg border border-line bg-surface p-3">
              <p className="text-sm font-semibold">{tacticIt(t.externalId, t.name)} <span className="text-xs font-normal text-muted">· {t.name}</span></p>
              <ul className="mt-1.5 space-y-0.5 text-xs">
                {t.techniques.map((x) => (
                  <li key={x.external_id}>
                    <a href={`https://attack.mitre.org/techniques/${x.external_id.replace(".", "/")}/`} target="_blank" rel="noreferrer" className="hover:underline">
                      <span className="font-mono text-muted">{x.external_id}</span> {x.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {d.tools.length > 0 && (
          <p className="text-sm">
            <span className="text-muted">Altri strumenti documentati: </span>
            {d.tools.map((t, i) => <span key={t.external_id}>{i > 0 && ", "}{t.name} <span className="text-xs text-muted">({t.type === "tool" ? "strumento" : "malware"})</span></span>)}
          </p>
        )}
      </section>

      {d.mitigations.length > 0 && (
        <Card title={<span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden className="size-4 text-ok" />Contromisure prioritarie (calcolate sulle sue tecniche)</span>}>
          <ol className="divide-y divide-line text-sm">
            {d.mitigations.map((m, i) => (
              <li key={m.mitigation.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                <span>
                  <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                  <Link href={`/mitigazioni/${m.mitigation.external_id}`} className="font-medium hover:underline">{mitigationIt(m.mitigation.external_id, m.mitigation.name)}</Link>{" "}
                  <span className="text-xs text-muted">({m.mitigation.name}, {m.mitigation.external_id}) · blocca o riduce {m.techniques} delle sue tecniche</span>
                </span>
                <MeasureBadges mitigation={m.mitigation.external_id} />
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Ordinate per numero di tecniche del gruppo che coprono. Le lettere NIS2 rimandano all&apos;art. 24, c. 2 D.Lgs. 138/2024
            (abbinamento del progetto).
          </p>
        </Card>
      )}

      <D3fendPanel techniques={d.techniqueIds} />

      {profile.attack.relatedGroup && (
        <p className="text-sm text-muted">
          Gruppo collegato in ATT&CK:{" "}
          <Link href={`/attori/${profile.attack.relatedGroup.id}`} className="text-accent hover:underline">{profile.attack.relatedGroup.label} ({profile.attack.relatedGroup.id})</Link>{" "}
          <Badge>associazione indicata da CISA</Badge>
        </p>
      )}
    </>
  );
}
