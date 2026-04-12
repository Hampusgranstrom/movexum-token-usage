// --- Lead sources ---

export type LeadSource = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
};

// --- Lead statuses ---

export type LeadStatus =
  | "new"
  | "contacted"
  | "meeting-booked"
  | "evaluating"
  | "accepted"
  | "declined";

export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; order: number }
> = {
  new: { label: "Ny", color: "accent-leads", order: 0 },
  contacted: { label: "Kontaktad", color: "accent-sources", order: 1 },
  "meeting-booked": { label: "Möte bokat", color: "accent-funnel", order: 2 },
  evaluating: { label: "Utvärderas", color: "text-secondary", order: 3 },
  accepted: { label: "Antagen", color: "accent-conversion", order: 4 },
  declined: { label: "Avböjd", color: "accent-danger", order: 5 },
};

// --- Lead ---

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  idea_summary: string | null;
  idea_category: string | null;
  source_id: string;
  source_detail: string | null;
  status: LeadStatus;
  score: number | null;
  score_reasoning: string | null;
  assigned_to: string | null;
  notes: string | null;
  tags: string[];
};

// --- Conversations & messages ---

export type ExtractedLeadData = {
  name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  idea_summary?: string;
  idea_category?: string;
  source_hint?: string;
  readiness_level?: "idea" | "prototype" | "mvp" | "revenue";
  needs?: string[];
};

export type Conversation = {
  id: string;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  session_id: string;
  language: string;
  extracted_data: ExtractedLeadData;
  total_input_tokens: number;
  total_output_tokens: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  created_at: string;
  role: "system" | "user" | "assistant";
  content: string;
  input_tokens: number;
  output_tokens: number;
};

// --- Dashboard API ---

export type DashboardSummary = {
  kpis: {
    totalLeads: number;
    leadsThisPeriod: number;
    leadsDelta: number;
    conversionRate: number;
    conversionDelta: number;
    activePipeline: number;
    pipelineDelta: number;
    avgScore: number;
    scoreDelta: number;
  };
  leadsPerDay: Array<{ date: string; count: number }>;
  leadsPerSource: Array<{
    source_id: string;
    label: string;
    count: number;
    color: string;
  }>;
  funnel: Array<{
    status: LeadStatus;
    label: string;
    count: number;
  }>;
};

// --- Lead list API ---

export type LeadListResponse = {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
};

// --- Chat API ---

export type ChatRequestBody = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId: string;
  conversationId?: string;
};

export type ChatResponse = {
  message: { role: "assistant"; content: string };
  conversationId: string;
  extractedData: ExtractedLeadData | null;
  leadCreated: boolean;
  leadId: string | null;
};
