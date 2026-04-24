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

export const STATUS_CONFIG: Record<LeadStatus, { label: string }> = {
  new: { label: "Ny" },
  contacted: { label: "Kontaktad" },
  "meeting-booked": { label: "Möte bokat" },
  evaluating: { label: "Utvärderas" },
  accepted: { label: "Antagen" },
  declined: { label: "Avböjd" },
};

// --- Lead ---

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  municipality: string | null;
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

// --- Conversations ---

export type ExtractedLeadData = {
  name?: string;
  email?: string;
  phone?: string;
  municipality?: string;
  organization?: string;
  idea_summary?: string;
  idea_category?: string;
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

export type LeadQuestionResponse = {
  id: string;
  created_at: string;
  skipped: boolean;
  response_time_ms: number | null;
  answer: unknown;
  question_key: string;
  question_text: string | null;
  variant_label: string | null;
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

// --- Analysis API ---

export type AnalysisSummary = {
  periodDays: number;
  generatedAt: string;
  overview: {
    users: number;
    sessions: number;
    engagedSessions: number;
    bounceRate: number;
    leads: number;
    acceptedLeads: number;
    leadConversionRate: number;
    avgScore: number;
    avgAssistantOutputTokens: number;
  };
  trend: {
    sessionsPerDay: Array<{ date: string; count: number }>;
    leadsPerDay: Array<{ date: string; count: number }>;
    messagesPerDay: Array<{ date: string; count: number }>;
  };
  acquisition: {
    channels: Array<{
      channel: string;
      medium: string;
      sessions: number;
      engagedSessions: number;
      leads: number;
      conversionRate: number;
    }>;
    campaigns: Array<{
      campaign: string;
      sessions: number;
      leads: number;
    }>;
    referrers: Array<{
      referrer: string;
      sessions: number;
    }>;
    locales: Array<{
      locale: string;
      sessions: number;
    }>;
  };
  engagement: {
    avgMessagesPerConversation: number;
    avgQuestionsAnsweredPerSession: number;
    avgResponseTimeMs: number;
    events: Array<{
      eventType: string;
      count: number;
    }>;
    moduleEngagement: Array<{
      module_id: string;
      slug: string;
      name: string;
      sessions: number;
      engagedSessions: number;
      completionRate: number;
      leadRate: number;
      avgResponsesPerSession: number;
    }>;
  };
  conversion: {
    steps: Array<{
      step: string;
      count: number;
      rateFromPrevious: number;
    }>;
    moduleFunnel: Array<{
      module_id: string;
      slug: string;
      name: string;
      started: number;
      completed: number;
      leads: number;
      accepted: number;
    }>;
  };
  geography: {
    municipalities: Array<{
      municipality: string;
      count: number;
    }>;
  };
  quality: {
    statusBreakdown: Array<{
      status: LeadStatus;
      label: string;
      count: number;
    }>;
    sourcePerformance: Array<{
      source_id: string;
      label: string;
      total: number;
      accepted: number;
      acceptedRate: number;
    }>;
  };
  performance: {
    webVitals: Array<{
      metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
      samples: number;
      avg: number;
      p75: number;
      prevP75: number;
      p75Delta: number;
      poorRate: number;
      rating: "good" | "needs-improvement" | "poor";
    }>;
    slowPaths: Array<{
      path: string;
      metric: "CLS" | "INP" | "LCP" | "FCP" | "TTFB";
      samples: number;
      p75: number;
      poorRate: number;
    }>;
  };
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
  language?: "sv" | "en" | "sv-easy";
};

export type ChatResponse = {
  message: { role: "assistant"; content: string };
  conversationId: string;
  extractedData: ExtractedLeadData | null;
  leadCreated: boolean;
  leadId: string | null;
  report?: {
    fileName: string;
    content: string;
  } | null;
};
