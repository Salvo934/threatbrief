import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RankedMitigations } from "@/components/mitigations/ranked-mitigations";
import { VictimsChart } from "@/components/ransomware/victims-chart";
import { Badge, Card, PageHeader, Skeleton, Stat } from "@/components/ui/primitives";
import { listGroups } from "@/lib/data/attack";
import { rankForTechniques } from "@/lib/data/mitigations";
import { getVictimsSince } from "@/lib/data/ransomware";
import { techniqueUsageForGroups } from "@/lib/data/sectors";
import { SECTORS, formatDate, formatNumber } from "@/lib/format";
import { isoMonthsAgoStart } from "@/lib/kev-stats";
import { topGroups, victimsByMonth } from "@/lib/ransomware-stats";

type Props = PageProps<"/settori/[id]">;

export default function SettorePage(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[700px]" />}>
      <Sector params={props.params} />
    </Suspense>
  );
}

async function Sector({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const sector = SECTORS.find((s) => s.id === id);
  if (!sector) notFound();
  await connection(); // finestre temporali calcolate sulla data della richiesta

  const today = new Date();
  const groups = await listGroups({ sector: sector.id });
  const [usage, victims] = await Promise.all([
    techniqueUsageForGroups(groups.map((g) => g.id)),
    sector.id === "telco" ? Promise.resolve([]) : getVictimsSince(isoMonthsAgoStart(today, 24), sector.id),
  ]);
  const mitigations = (await rankForTechniques(usage.weights)).slice(0, 10);
  const since12 = isoMonthsAgoStart(today, 12);
  const last12 = victims.filter((v) => v.discovered_at >= since12);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/settori" className="text-sm text-muted hover:underline">← Settori</Link>
        <PageHeader title={sector.name}>
          Quadro del settore da fonti aperte. Gli attori sono quelli per cui le descrizioni ATT&CK citano il settore
          (attributo <Badge tone="warn">derivato</Badge>, da verificare); le rivendicazioni ransomware sono quelle
          pubblicate dai gruppi sui loro leak site e raccolte da ransomware.live: <strong>non sono verificate</strong>.
        </PageHeader>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Attori ATT&CK" value={formatNumber(groups.length)} hint="settore citato nella descrizione" />
        <Stat label="Tecniche osservate" value={formatNumber(usage.weights.size)} hint="usate da almeno un attore" />
        <Stat label="Rivendicazioni IT · 12 mesi" value={sector.id === "telco" ? "n.d." : formatNumber(last12.length)} />
        <Stat label="Gruppi ransomware · 12 mesi" value={sector.id === "telco" ? "n.d." : formatNumber(new Set(last12.map((v) => v.group_name)).size)} />
      </div>

      {sector.id === "telco" ? (
        <Card title="Ransomware">
          <p className="text-sm text-muted">
            ransomware.live non ha una categoria per le telecomunicazioni (le vittime finiscono in
            &laquo;Technology&raquo; insieme ad altre aziende): per non attribuire dati in modo arbitrario, qui non
            mostriamo rivendicazioni.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card title="Rivendicazioni ransomware contro organizzazioni italiane" className="lg:col-span-3">
            <VictimsChart data={victimsByMonth(victims, today, 24)} label={`Rivendicazioni ransomware per mese, settore ${sector.name}, ultimi 24 mesi`} />
            <p className="mt-2 text-xs text-muted">Per mese di pubblicazione rilevata, ultimi 24 mesi. Fonte: ransomware.live.</p>
          </Card>
          <Card title="Gruppi più attivi · 12 mesi" className="lg:col-span-2">
            {last12.length === 0 ? (
              <p className="text-sm text-muted">Nessuna rivendicazione negli ultimi 12 mesi.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {topGroups(last12).map((g) => (
                  <li key={g.group} className="flex justify-between gap-3">
                    <span className="font-mono text-xs">{g.group}</span>
                    <span className="tabular-nums text-muted">{g.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Mitigazioni prioritarie">
          <RankedMitigations
            items={mitigations}
            scoreLabel={(r) => `copre ${r.techniques} tecniche usate da questi attori (peso ${r.score})`}
          />
          <p className="mt-3 text-xs text-muted">
            Ordinate per quante tecniche coprono, pesate per il numero di attori che le usano. Le lettere NIS2 rimandano
            all&apos;<Link href="/mitigazioni" className="underline">art. 24, c. 2</Link>.
          </p>
        </Card>
        <Card title="Tecniche più usate dagli attori del settore">
          {usage.ranking.length === 0 ? (
            <p className="text-sm text-muted">Nessun attore associato al settore.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {usage.ranking.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-1.5">
                  <a
                    href={`https://attack.mitre.org/techniques/${t.external_id.replace(".", "/")}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    <span className="font-mono text-xs text-muted">{t.external_id}</span> {t.name}
                  </a>
                  <span className="whitespace-nowrap text-xs tabular-nums text-muted">
                    {t.groups} di {groups.length} attori
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Attori ATT&CK (${groups.length})`} action={<Link href={`/attori?settore=${sector.id}`} className="text-xs text-accent hover:underline">Vedi elenco →</Link>}>
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <Link key={g.id} href={`/attori/${g.external_id}`}>
                <Badge>{g.name}</Badge>
              </Link>
            ))}
          </div>
        </Card>
        {sector.id !== "telco" && (
          <Card title="Ultime rivendicazioni">
            {victims.length === 0 ? (
              <p className="text-sm text-muted">Nessuna rivendicazione negli ultimi 24 mesi.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="py-1 pr-3 font-medium">Rilevata</th>
                    <th className="py-1 pr-3 font-medium">Organizzazione (dichiarata dal gruppo)</th>
                    <th className="py-1 font-medium">Gruppo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {victims.slice(0, 10).map((v) => (
                    <tr key={v.external_id}>
                      <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums text-muted">{formatDate(v.discovered_at)}</td>
                      <td className="py-1.5 pr-3">{v.victim}</td>
                      <td className="py-1.5 font-mono text-xs">{v.group_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
