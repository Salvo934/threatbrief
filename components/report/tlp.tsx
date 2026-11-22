import type { Tlp } from "@/lib/report/types";

/** Colori ufficiali FIRST TLP 2.0 (testo colorato su sfondo nero). */
export const TLP_COLOR: Record<Tlp, string> = {
  CLEAR: "#FFFFFF",
  GREEN: "#33FF00",
  AMBER: "#FFC000",
  "AMBER+STRICT": "#FFC000",
  RED: "#FF2B2B",
};

export const TLP_HELP: Record<Tlp, string> = {
  CLEAR: "Divulgazione senza limiti",
  GREEN: "Condivisibile nella comunità, non pubblicamente",
  AMBER: "Solo all'interno dell'organizzazione e dei suoi clienti, secondo necessità",
  "AMBER+STRICT": "Solo all'interno dell'organizzazione",
  RED: "Solo ai destinatari presenti",
};

export function TlpLabel({ tlp }: { tlp: Tlp }) {
  return (
    <span
      title={TLP_HELP[tlp]}
      className="inline-block rounded-sm bg-black px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none"
      style={{ color: TLP_COLOR[tlp] }}
    >
      TLP:{tlp}
    </span>
  );
}
