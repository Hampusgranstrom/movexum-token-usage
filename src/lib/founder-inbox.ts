import type { ExtractedLeadData } from "./types";
import { isValidEmail } from "./validation";

export type FounderLanguage = "sv" | "en" | "sv-easy";

type FounderInboxInput = {
  toEmail: string;
  founderName?: string | null;
  moduleName?: string | null;
  source: "chat" | "form" | "quiz";
  language?: FounderLanguage;
  data: Partial<ExtractedLeadData>;
};

type Copy = {
  subject: string;
  intro: string;
  summaryLabel: string;
  summaryFallback: string;
  nextStepsLabel: string;
  checklistLabel: string;
  progressLabel: string;
  progressNow: string;
  progressNext: string;
  progressLater: string;
  cta: string;
  aiLabel: string;
};

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function chooseLanguage(value: unknown): FounderLanguage {
  if (value === "en" || value === "sv-easy" || value === "sv") return value;
  return "sv";
}

function inferLanguageFromLocale(locale: string | null | undefined): FounderLanguage {
  const l = (locale ?? "").toLowerCase();
  if (l.startsWith("en")) return "en";
  return "sv";
}

function copyFor(language: FounderLanguage, founderName: string | null): Copy {
  const name = founderName ?? (language === "en" ? "founder" : "grundare");

  if (language === "en") {
    return {
      subject: "Your Startupkompassen summary",
      intro: `Hi ${name}, thanks for sharing your idea with us.`,
      summaryLabel: "Summary",
      summaryFallback: "No summary could be generated yet.",
      nextStepsLabel: "Recommended next steps",
      checklistLabel: "Document checklist",
      progressLabel: "Progress tracking",
      progressNow: "You are here: Submission received",
      progressNext: "Next: Initial review by Movexum",
      progressLater: "Then: Personal feedback and suggested next meeting",
      cta: "Reply to this email if you want us to focus on a specific part of your idea.",
      aiLabel: "AI-generated summary",
    };
  }

  if (language === "sv-easy") {
    return {
      subject: "Din sammanfattning fran Startupkompassen",
      intro: `Hej ${name}, tack for att du skickade in din ide.`,
      summaryLabel: "Sammanfattning",
      summaryFallback: "Vi kunde inte skapa en sammanfattning an.",
      nextStepsLabel: "Nasta steg",
      checklistLabel: "Checklista dokument",
      progressLabel: "Var du ar i processen",
      progressNow: "Du ar har: Vi har fatt din ansokan",
      progressNext: "Nasta: Movexum gor en forsta genomgang",
      progressLater: "Sedan: Du far personlig aterkoppling och forslag pa nasta mote",
      cta: "Svara pa mailet om du vill att vi tittar extra pa nagot.",
      aiLabel: "AI-genererad sammanfattning",
    };
  }

  return {
    subject: "Din sammanfattning fran Startupkompassen",
    intro: `Hej ${name}, tack for att du delade din ide med oss.`,
    summaryLabel: "Sammanfattning",
    summaryFallback: "Ingen sammanfattning kunde skapas i detta steg.",
    nextStepsLabel: "Rekommenderade nasta steg",
    checklistLabel: "Dokumentchecklista",
    progressLabel: "Progress tracking",
    progressNow: "Du ar har: Inskickat",
    progressNext: "Nasta steg: Forsta genomgang hos Movexum",
    progressLater: "Sedan: Personlig aterkoppling och forslag pa nasta mote",
    cta: "Svara pa mailet om du vill att vi fokuserar pa en viss del av iden.",
    aiLabel: "AI-genererad sammanfattning",
  };
}

function deriveNextSteps(data: Partial<ExtractedLeadData>, language: FounderLanguage): string[] {
  const idea = clean(data.idea_summary)?.toLowerCase() ?? "";

  if (language === "en") {
    const steps: string[] = [];
    if (!idea.includes("customer") && !idea.includes("target")) {
      steps.push("Define your primary customer and the problem urgency.");
    }
    if (!idea.includes("price") && !idea.includes("revenue") && !idea.includes("pay")) {
      steps.push("Outline your revenue model and first pricing hypothesis.");
    }
    if (!idea.includes("pilot") && !idea.includes("test") && !idea.includes("validate")) {
      steps.push("Plan a small pilot to validate demand in 2-4 weeks.");
    }
    if (steps.length === 0) {
      steps.push("Prioritize your top assumptions and test them in customer interviews.");
      steps.push("Summarize insights and iterate on your offer before scaling.");
    }
    return steps.slice(0, 3);
  }

  const steps: string[] = [];
  if (!idea.includes("kund") && !idea.includes("malgrupp")) {
    steps.push("Beskriv tydligt vem er malgrupp ar och vilket problem som ar mest akut.");
  }
  if (!idea.includes("intakt") && !idea.includes("pris") && !idea.includes("betala")) {
    steps.push("Definiera en enkel intaktsmodell och forsta prisantagande.");
  }
  if (!idea.includes("pilot") && !idea.includes("test") && !idea.includes("valider")) {
    steps.push("Planera ett avgransat pilot-test for att validera behovet inom 2-4 veckor.");
  }
  if (steps.length === 0) {
    steps.push("Prioritera era viktigaste antaganden och testa dem med riktiga kundsamtal.");
    steps.push("Sammanfatta larandet och uppdatera erbjudandet innan nasta iteration.");
  }
  return steps.slice(0, 3);
}

function checklistFor(language: FounderLanguage): string[] {
  if (language === "en") {
    return [
      "One-page problem and solution brief",
      "Target customer profile (ICP)",
      "Early traction or validation notes",
      "Team overview and roles",
    ];
  }
  if (language === "sv-easy") {
    return [
      "En sida: problem och losning",
      "Vem ar kunden?",
      "Bevis eller test ni redan gjort",
      "Kort om teamet och roller",
    ];
  }
  return [
    "Ensidig beskrivning av problem och losning",
    "Malkundsprofil (ICP)",
    "Tidiga signaler pa traction eller validering",
    "Kort teamoversikt och ansvar",
  ];
}

function buildTextBody(input: FounderInboxInput, language: FounderLanguage): string {
  const summary = clean(input.data.idea_summary);
  const founderName = clean(input.founderName);
  const c = copyFor(language, founderName);
  const steps = deriveNextSteps(input.data, language);
  const checklist = checklistFor(language);

  const lines: string[] = [];
  lines.push(c.intro);
  lines.push("");
  lines.push(`${c.progressLabel}`);
  lines.push(`- ${c.progressNow}`);
  lines.push(`- ${c.progressNext}`);
  lines.push(`- ${c.progressLater}`);
  lines.push("");
  if (input.moduleName) {
    lines.push(`Modul: ${input.moduleName}`);
    lines.push("");
  }
  lines.push(`${c.summaryLabel} (${c.aiLabel})`);
  lines.push(summary ?? c.summaryFallback);
  lines.push("");
  lines.push(c.nextStepsLabel);
  for (const step of steps) {
    lines.push(`- ${step}`);
  }
  lines.push("");
  lines.push(c.checklistLabel);
  for (const item of checklist) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push(c.cta);

  return lines.join("\n");
}

function buildHtmlBody(input: FounderInboxInput, language: FounderLanguage): string {
  const summary = clean(input.data.idea_summary);
  const founderName = clean(input.founderName);
  const c = copyFor(language, founderName);
  const steps = deriveNextSteps(input.data, language);
  const checklist = checklistFor(language);

  return `
<div style="font-family: Arial, sans-serif; line-height:1.6; color:#0A0A0A; max-width:640px; margin:0 auto;">
  <p>${c.intro}</p>
  <h3 style="margin-bottom:8px;">${c.progressLabel}</h3>
  <ul>
    <li>${c.progressNow}</li>
    <li>${c.progressNext}</li>
    <li>${c.progressLater}</li>
  </ul>
  ${input.moduleName ? `<p><strong>Modul:</strong> ${input.moduleName}</p>` : ""}
  <h3 style="margin-bottom:8px;">${c.summaryLabel} <span style="font-size:12px; color:#737373;">(${c.aiLabel})</span></h3>
  <p>${summary ?? c.summaryFallback}</p>
  <h3 style="margin-bottom:8px;">${c.nextStepsLabel}</h3>
  <ul>${steps.map((s) => `<li>${s}</li>`).join("")}</ul>
  <h3 style="margin-bottom:8px;">${c.checklistLabel}</h3>
  <ul>${checklist.map((i) => `<li>${i}</li>`).join("")}</ul>
  <p>${c.cta}</p>
</div>
  `.trim();
}

export async function sendFounderInboxEmail(input: FounderInboxInput): Promise<void> {
  const to = clean(input.toEmail)?.toLowerCase() ?? "";
  if (!isValidEmail(to)) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FOUNDER_INBOX_FROM;
  if (!apiKey || !from) return;

  const language = chooseLanguage(input.language);
  const c = copyFor(language, clean(input.founderName));

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: c.subject,
      text: buildTextBody(input, language),
      html: buildHtmlBody(input, language),
      tags: [
        { name: "type", value: "founder-inbox" },
        { name: "source", value: input.source },
        { name: "ai_generated", value: "true" },
      ],
    }),
  }).catch(() => {
    /* best-effort email send */
  });
}

export function resolveFounderLanguage(value: unknown, locale?: string | null): FounderLanguage {
  if (value === "sv" || value === "en" || value === "sv-easy") return value;
  return inferLanguageFromLocale(locale);
}