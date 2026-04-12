export const DEFAULT_SOURCES = [
  { id: "event", label: "Event", icon: "Calendar", color: "#FACC15" },
  { id: "web", label: "Webbformulär", icon: "Globe", color: "#22D3EE" },
  { id: "social-media", label: "Sociala medier", icon: "Share2", color: "#A78BFA" },
  { id: "referral", label: "Rekommendation", icon: "Users", color: "#4ADE80" },
  { id: "conversation", label: "Samtal", icon: "Phone", color: "#FB923C" },
  { id: "ai-chat", label: "AI-intag", icon: "Sparkles", color: "#F472B6" },
] as const;

export type SourceId = (typeof DEFAULT_SOURCES)[number]["id"];
