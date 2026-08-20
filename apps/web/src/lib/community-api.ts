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

// Fallback Polls Client Mock
function getFallbackPolls(): CommunityPoll[] {
  return [];
}
