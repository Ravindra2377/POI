const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN_KEY = "viksit_professional_session";

export type ProfessionalPlan = "professional" | "organization";
export type ProfessionalAccessPlan = "none" | ProfessionalPlan;
export type ProfessionalBillingStatus =
  | "not_started"
  | "payment_pending"
  | "paid"
  | "past_due"
  | "cancelled"
  | "complimentary";
export type ProfessionalStatus =
  | "pending_verification"
  | "pending_review"
  | "active"
  | "suspended"
  | "rejected";

export interface ProfessionalAccount {
  id: string;
  email: string;
  display_name: string;
  organization_name: string;
  requested_plan: ProfessionalPlan;
  access_plan: ProfessionalAccessPlan;
  billing_status: ProfessionalBillingStatus;
  status: ProfessionalStatus;
  email_verified_at?: string | null;
  created_at: string;
}

export interface ProfessionalAuditRecord {
  id: string;
  professional_account_id: string;
  staff_account_id?: string | null;
  action: string;
  reason: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  created_at: string;
}

export interface ProfessionalRegistrationStatus {
  registration_enabled: boolean;
  email_verification_available: boolean;
}

interface ProfessionalSession {
  access_token: string;
  expires_at: string;
  account: ProfessionalAccount;
}

function professionalToken(): string {
  return typeof window === "undefined"
    ? ""
    : sessionStorage.getItem(TOKEN_KEY) || "";
}

async function professionalRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const accessToken = professionalToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || "Professional account request failed");
  }
  return response;
}

export async function fetchProfessionalRegistrationStatus(): Promise<ProfessionalRegistrationStatus> {
  const response = await professionalRequest(
    "/professional/registration-status",
  );
  return response.json();
}

export async function registerProfessionalAccount(data: {
  email: string;
  display_name: string;
  organization_name: string;
  password: string;
  requested_plan: ProfessionalPlan;
}): Promise<void> {
  await professionalRequest("/professional/register", {
    method: "POST",
    body: JSON.stringify({ ...data, accept_terms: true }),
  });
}

export async function verifyProfessionalEmail(
  verificationToken: string,
): Promise<ProfessionalAccount> {
  const response = await professionalRequest("/professional/verify-email", {
    method: "POST",
    body: JSON.stringify({ token: verificationToken }),
  });
  return response.json();
}

export async function loginProfessionalAccount(
  email: string,
  password: string,
): Promise<ProfessionalAccount> {
  const response = await professionalRequest("/professional/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session: ProfessionalSession = await response.json();
  sessionStorage.setItem(TOKEN_KEY, session.access_token);
  return session.account;
}

export async function restoreProfessionalSession(): Promise<ProfessionalAccount | null> {
  if (!professionalToken()) return null;
  try {
    const response = await professionalRequest("/professional/me");
    return await response.json();
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

export async function logoutProfessionalAccount(): Promise<void> {
  try {
    await professionalRequest("/professional/logout", { method: "POST" });
  } finally {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}
