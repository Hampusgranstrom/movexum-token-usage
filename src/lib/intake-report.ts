import type { ExtractedLeadData } from "./types";

type ReportInput = {
  source: "chat" | "form" | "quiz";
  moduleName?: string | null;
  data: Partial<ExtractedLeadData>;
  extraInsights?: string[];
};

export type DownloadReport = {
  fileName: string;
  content: string;
};

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function deriveNextSteps(data: Partial<ExtractedLeadData>): string[] {
  const steps: string[] = [];
  const idea = clean(data.idea_summary)?.toLowerCase() ?? "";

  if (!clean(data.idea_summary)) {
    steps.push("Formulera iden i en tydlig mening: problem, malgrupp och foreslagen losning.");
  } else {
    if (!idea.includes("kund") && !idea.includes("malgrupp")) {
      steps.push("Beskriv vem som ar den primara kunden och varfor just den gruppen har behovet.");
    }
    if (!idea.includes("betala") && !idea.includes("intakt") && !idea.includes("pris")) {
      steps.push("Definiera hur erbjudandet ska generera intakt (pris, abonnemang eller annan modell).");
    }
    if (!idea.includes("test") && !idea.includes("pilot") && !idea.includes("valider")) {
      steps.push("Planera ett litet test/pilot for att validera behovet innan storre investeringar.");
    }
  }

  if (steps.length === 0) {
    steps.push("Prioritera de 1-2 viktigaste antagandena och testa dem med verkliga kundsamtal kommande 2 veckor.");
    steps.push("Sammanfatta feedback och uppdatera erbjudandet innan nasta iteration.");
  }

  return steps.slice(0, 3);
}

export function buildLeadReport(input: ReportInput): DownloadReport {
  const now = new Date();
  const date = now.toLocaleDateString("sv-SE");
  const time = now.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  const prefix = input.source === "chat" ? "chatt" : input.source === "quiz" ? "quiz" : "formular";

  const data = {
    name: clean(input.data.name) ?? undefined,
    email: clean(input.data.email) ?? undefined,
    phone: clean(input.data.phone) ?? undefined,
    municipality: clean(input.data.municipality) ?? undefined,
    organization: clean(input.data.organization) ?? undefined,
    idea_summary: clean(input.data.idea_summary) ?? undefined,
    idea_category: clean(input.data.idea_category) ?? undefined,
  };

  const lines: string[] = [];
  lines.push("STARTUPKOMPASSEN - KORT INSIKTSRAPPORT");
  lines.push(`Skapad: ${date} ${time}`);
  lines.push(`Kalla: ${prefix}`);
  if (input.moduleName) lines.push(`Modul: ${input.moduleName}`);
  lines.push("");

  lines.push("SAMMANFATTNING");
  lines.push(data.idea_summary ?? "Ingen sammanfattning kunde extraheras i detta steg.");
  lines.push("");

  lines.push("GRUNDUPPGIFTER");
  lines.push(`Namn: ${data.name ?? "-"}`);
  lines.push(`E-post: ${data.email ?? "-"}`);
  lines.push(`Telefon: ${data.phone ?? "-"}`);
  lines.push(`Organisation: ${data.organization ?? "-"}`);
  lines.push(`Kommun: ${data.municipality ?? "-"}`);
  lines.push(`Kategori: ${data.idea_category ?? "-"}`);
  lines.push("");

  lines.push("NESTA STEG");
  for (const step of deriveNextSteps(data)) {
    lines.push(`- ${step}`);
  }

  if (input.extraInsights && input.extraInsights.length > 0) {
    lines.push("");
    lines.push("EXTRA INSIKTER");
    for (const row of input.extraInsights) {
      const t = clean(row);
      if (t) lines.push(`- ${t}`);
    }
  }

  lines.push("");
  lines.push("Rapporten ar automatiskt genererad och avsedd som underlag for nasta steg.");

  const safeName = (data.name ?? "insiktsrapport")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return {
    fileName: `startupkompassen-${prefix}-${safeName || "rapport"}.txt`,
    content: lines.join("\n"),
  };
}
