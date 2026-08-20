const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "viksit_staff_session";

export interface StaffAccount {
  id: string;
  email: string;
  display_name: string;
  role: "admin" | "moderator";
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

interface StaffSession {
  access_token: string;
  expires_at: string;
  staff: StaffAccount;
}

function token(): string {
  return typeof window === "undefined"
    ? ""
    : sessionStorage.getItem(TOKEN_KEY) || "";
}

async function staffRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const accessToken = token();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || "Staff request failed");
  }
  return response;
}

export async function loginStaff(
  email: string,
  password: string,
): Promise<StaffAccount> {
  const response = await staffRequest("/staff/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session: StaffSession = await response.json();
  sessionStorage.setItem(TOKEN_KEY, session.access_token);
  return session.staff;
}

export async function restoreStaffSession(): Promise<StaffAccount | null> {
  if (!token()) return null;
  try {
    const response = await staffRequest("/staff/me");
    return await response.json();
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export async function logoutStaff(): Promise<void> {
  try {
    await staffRequest("/staff/logout", { method: "POST" });
  } finally {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export async function changeStaffPassword(
  currentPassword: string,
  newPassword: string,
): Promise<StaffAccount> {
  const response = await staffRequest("/staff/password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  const session: StaffSession = await response.json();
  sessionStorage.setItem(TOKEN_KEY, session.access_token);
  return session.staff;
}

export async function createModerator(data: {
  email: string;
  display_name: string;
  temporary_password: string;
}): Promise<StaffAccount> {
  const response = await staffRequest("/staff/accounts", {
    method: "POST",
    body: JSON.stringify({ ...data, role: "moderator" }),
  });
  return response.json();
}

export async function fetchStaffAccounts(): Promise<StaffAccount[]> {
  const response = await staffRequest("/staff/accounts");
  return response.json();
}

export async function moderateContent(data: {
  action: "approve" | "flag" | "hide" | "restore";
  target_type: "report" | "comment";
  target_id: string;
  reason: string;
}) {
  const response = await staffRequest("/community/moderation", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}

export interface ModerationQueueItem {
  target_type: "report" | "comment";
  target_id: string;
  username: string;
  summary: string;
  status: string;
  created_at: string;
}

export interface AdminCommunityContent {
  target_type: "report" | "comment";
  target_id: string;
  username: string;
  summary_en: string;
  summary_te?: string | null;
  detail_en?: string | null;
  detail_te?: string | null;
  classification: "community_reported";
  status: string;
  created_at: string;
}

export interface StaffAuditRecord {
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

export async function fetchModerationQueue(): Promise<ModerationQueueItem[]> {
  const response = await staffRequest("/community/moderation-queue");
  return response.json();
}

export async function fetchAdminCommunityContent(): Promise<
  AdminCommunityContent[]
> {
  const response = await staffRequest("/community/admin/content?page_size=200");
  return response.json();
}

export async function fetchStaffAuditLog(): Promise<StaffAuditRecord[]> {
  const response = await staffRequest("/community/moderation-log");
  return response.json();
}
