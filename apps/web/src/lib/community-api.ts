const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UserAccount {
  id: string;
  username: string;
  display_name: string;
  district_id?: string | null;
  consent_data_sharing: boolean;
  consent_public_activity: boolean;
  preferred_language: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  label_en: string;
  label_te?: string | null;
  vote_count: number;
}

export interface CommunityPoll {
  id: string;
  title_en: string;
  title_te?: string | null;
  description_en: string;
  description_te?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  options: PollOption[];
  total_votes: number;
  is_active: boolean;
  non_representative_disclaimer: string;
  created_at: string;
}

export interface CommunityReport {
  id: string;
  user_id: string;
  username: string;
  entity_type: string;
  entity_id?: string | null;
  district_id?: string | null;
  title_en: string;
  title_te?: string | null;
  description_en: string;
  description_te?: string | null;
  classification: string;
  evidence_urls: string[];
  status: string;
  created_at: string;
}

export interface CommunityComment {
  id: string;
  user_id: string;
  username: string;
  target_type: string;
  target_id: string;
  rating?: number | null;
  content_en: string;
  content_te?: string | null;
  status: string;
  created_at: string;
}

export interface ModerationAuditRecord {
  id: string;
  moderator_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  created_at: string;
}

// Client API Helper Methods
export async function getAnonymousUser(
  username: string,
): Promise<UserAccount | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/community/users/${username}`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function saveAnonymousUser(data: {
  username: string;
  display_name: string;
  district_id?: string | null;
  consent_data_sharing: boolean;
  consent_public_activity: boolean;
  preferred_language: string;
}): Promise<UserAccount> {
  const res = await fetch(`${API_BASE_URL}/api/v1/community/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to save anonymous account profile");
  return res.json();
}

export async function fetchCommunityPolls(): Promise<CommunityPoll[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/community/polls`);
    if (!res.ok) return getFallbackPolls();
    return await res.json();
  } catch {
    return getFallbackPolls();
  }
}

export async function submitPollVote(
  pollId: string,
  username: string,
  optionId: string,
): Promise<CommunityPoll> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/community/polls/${pollId}/vote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poll_id: pollId, username, option_id: optionId }),
    },
  );
  if (!res.ok) throw new Error("Failed to submit poll vote");
  return res.json();
}

export async function fetchCommunityReports(
  entityType?: string,
  entityId?: string,
): Promise<CommunityReport[]> {
  try {
    const params = new URLSearchParams();
    if (entityType) params.set("entity_type", entityType);
    if (entityId) params.set("entity_id", entityId);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/community/reports?${params.toString()}`,
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitCommunityReport(data: {
  username: string;
  entity_type: string;
  entity_id?: string;
  title_en: string;
  title_te?: string;
  description_en: string;
  description_te?: string;
  evidence_urls?: string[];
}): Promise<CommunityReport> {
  const res = await fetch(`${API_BASE_URL}/api/v1/community/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit report");
  return res.json();
}

export async function fetchCommunityComments(
  targetType?: string,
  targetId?: string,
): Promise<CommunityComment[]> {
  try {
    const params = new URLSearchParams();
    if (targetType) params.set("target_type", targetType);
    if (targetId) params.set("target_id", targetId);
    const res = await fetch(
      `${API_BASE_URL}/api/v1/community/comments?${params.toString()}`,
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitCommunityComment(data: {
  username: string;
  target_type: string;
  target_id: string;
  rating?: number;
  content_en: string;
  content_te?: string;
}): Promise<CommunityComment> {
  const res = await fetch(`${API_BASE_URL}/api/v1/community/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit comment");
  return res.json();
}

export async function fetchModerationAuditLog(): Promise<
  ModerationAuditRecord[]
> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/community/moderation-log`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function submitModerationAction(data: {
  moderator_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  new_status?: string;
}): Promise<ModerationAuditRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/community/moderation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to execute moderation action");
  return res.json();
}

// Fallback Polls Client Mock
function getFallbackPolls(): CommunityPoll[] {
  return [
    {
      id: "11111111-1111-1111-1111-111111111111",
      title_en: "Rythu Bharosa Disbursement Experience",
      title_te: "రైతు భరోసా నిధుల విడుదల అనుభవం",
      description_en:
        "Have you or your family received the latest financial assistance under the Rythu Bharosa scheme in your mandal?",
      description_te:
        "మీ మండలంలో రైతు భరోసా పథకం కింద ఇటీవల ఆర్థిక సాయం అందిందా?",
      entity_type: "scheme",
      entity_id: "ysr-rythu-bharosa",
      options: [
        {
          id: "opt_full",
          label_en: "Yes, full amount received",
          label_te: "అవును, పూర్తి నగదు అందింది",
          vote_count: 42,
        },
        {
          id: "opt_partial",
          label_en: "Partially / Delay experienced",
          label_te: "పాక్షికంగా / ఆలస్యం అయింది",
          vote_count: 14,
        },
        {
          id: "opt_pending",
          label_en: "Pending eligibility review",
          label_te: "అర్హత సమీక్ష పెండింగ్‌లో ఉంది",
          vote_count: 9,
        },
      ],
      total_votes: 65,
      is_active: true,
      non_representative_disclaimer:
        "Non-representative Community Pulse — Opinions recorded here represent platform participants only and are NOT a statistically representative sample of Andhra Pradesh.",
      created_at: new Date().toISOString(),
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      title_en: "Visakhapatnam Metro Transit Progress",
      title_te: "విశాఖపట్నం మెట్రో ప్రాజెక్టు పురోగతి",
      description_en:
        "How would you rate the current ground activity on the Visakhapatnam Metro Transit Corridor?",
      description_te:
        "విశాఖపట్నం మెట్రో కారిడార్ నిర్మాణ పురోగతిని ఎలా అంచనా వేస్తారు?",
      entity_type: "project",
      entity_id: "visakhapatnam-metro",
      options: [
        {
          id: "opt_active",
          label_en: "Active ground work visible",
          label_te: "పనులు చురుగ్గా సాగుతున్నాయి",
          vote_count: 28,
        },
        {
          id: "opt_slow",
          label_en: "Slow progress / Obstacles",
          label_te: "నెమ్మదిగా సాగుతున్నాయి",
          vote_count: 35,
        },
        {
          id: "opt_none",
          label_en: "No ground activity",
          label_te: "పనులు ప్రారంభం కాలేదు",
          vote_count: 12,
        },
      ],
      total_votes: 75,
      is_active: true,
      non_representative_disclaimer:
        "Non-representative Community Pulse — Opinions recorded here represent platform participants only and are NOT a statistically representative sample of Andhra Pradesh.",
      created_at: new Date().toISOString(),
    },
  ];
}
