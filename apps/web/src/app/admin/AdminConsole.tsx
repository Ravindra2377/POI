"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminOverview } from "./AdminOverview";
import { ProfessionalAccountsAdmin } from "./ProfessionalAccountsAdmin";
import {
  AdminCommunityContent,
  changeStaffPassword,
  createModerator,
  fetchAdminCommunityContent,
  fetchModerationQueue,
  fetchProfessionalAccountAudit,
  fetchProfessionalAccounts,
  fetchStaffAccounts,
  fetchStaffAuditLog,
  loginStaff,
  logoutStaff,
  moderateContent,
  restoreStaffSession,
  ModerationQueueItem,
  StaffAccount,
  StaffAuditRecord,
  updateProfessionalAccount,
} from "@/lib/staff-api";
import type {
  ProfessionalAccount,
  ProfessionalAuditRecord,
} from "@/lib/professional-api";

const fieldStyle = {
  width: "100%",
  padding: "0.7rem",
  border: "1px solid var(--border-color, #cbd5e1)",
  borderRadius: "6px",
} as const;

export function AdminConsole() {
  const [staff, setStaff] = useState<StaffAccount | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  const [error, setError] = useState("");
  const [content, setContent] = useState<AdminCommunityContent[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [auditLog, setAuditLog] = useState<StaffAuditRecord[]>([]);
  const [professionalAccounts, setProfessionalAccounts] = useState<
    ProfessionalAccount[]
  >([]);
  const [professionalAudit, setProfessionalAudit] = useState<
    ProfessionalAuditRecord[]
  >([]);
  const [contentStatus, setContentStatus] = useState("all");

  useEffect(() => {
    restoreStaffSession().then((account) => {
      setStaff(account);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (staff && !staff.must_change_password) {
      fetchModerationQueue()
        .then(setQueue)
        .catch(() => setQueue([]));
      if (staff.role === "admin") {
        Promise.all([
          fetchAdminCommunityContent(),
          fetchStaffAccounts(),
          fetchStaffAuditLog(),
          fetchProfessionalAccounts(),
          fetchProfessionalAccountAudit(),
        ])
          .then(
            ([
              allContent,
              accounts,
              actions,
              customerAccounts,
              customerAudit,
            ]) => {
              setContent(allContent);
              setStaffAccounts(accounts);
              setAuditLog(actions);
              setProfessionalAccounts(customerAccounts);
              setProfessionalAudit(customerAudit);
            },
          )
          .catch(() =>
            setError("The administrator overview could not be loaded."),
          );
      }
    }
  }, [staff]);

  const visibleContent =
    contentStatus === "all"
      ? content
      : content.filter((item) => item.status === contentStatus);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      setStaff(
        await loginStaff(
          String(data.get("email")),
          String(data.get("password")),
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("new_password") !== data.get("confirmation")) {
      setError("New passwords do not match");
      return;
    }
    try {
      setStaff(
        await changeStaffPassword(
          String(data.get("current_password")),
          String(data.get("new_password")),
        ),
      );
      setMessage("Password changed. Your staff session has been renewed.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Password change failed",
      );
    }
  }

  async function moderate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await moderateContent({
        action: String(data.get("action")) as
          | "approve"
          | "flag"
          | "hide"
          | "restore",
        target_type: String(data.get("target_type")) as "report" | "comment",
        target_id: String(data.get("target_id")),
        reason: String(data.get("reason")),
      });
      form.reset();
      setQueue(await fetchModerationQueue());
      if (staff?.role === "admin") {
        setContent(await fetchAdminCommunityContent());
        setAuditLog(await fetchStaffAuditLog());
      }
      setMessage(
        "Content state updated and an immutable audit record was created.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Moderation failed");
    }
  }

  async function addModerator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await createModerator({
        email: String(data.get("email")),
        display_name: String(data.get("display_name")),
        temporary_password: String(data.get("temporary_password")),
      });
      form.reset();
      setStaffAccounts(await fetchStaffAccounts());
      setMessage(
        "Moderator created. Share the temporary password through a secure channel.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Moderator creation failed",
      );
    }
  }

  async function manageProfessionalAccount(
    accountId: string,
    update: Parameters<typeof updateProfessionalAccount>[1],
  ) {
    setError("");
    setMessage("");
    await updateProfessionalAccount(accountId, update);
    const [accounts, actions] = await Promise.all([
      fetchProfessionalAccounts(),
      fetchProfessionalAccountAudit(),
    ]);
    setProfessionalAccounts(accounts);
    setProfessionalAudit(actions);
    setMessage(
      "Professional access updated, customer sessions revoked and an audit record created.",
    );
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">RESTRICTED STAFF AREA</p>
          <h1>Community moderation console</h1>
          <p className="lede">
            Citizens remain pseudonymous. Only authenticated staff can change
            content state, and every decision creates an audit record.
          </p>
        </header>
        <section className="section shell">
          {checking ? (
            <p>Checking staff session…</p>
          ) : !staff ? (
            <form
              onSubmit={signIn}
              style={{ display: "grid", gap: "1rem", maxWidth: "32rem" }}
            >
              <h2>Staff sign in</h2>
              <label>
                Email
                <input name="email" type="email" required style={fieldStyle} />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  style={fieldStyle}
                />
              </label>
              <button className="button button--primary" type="submit">
                Sign in
              </button>
            </form>
          ) : staff.must_change_password ? (
            <form
              onSubmit={changePassword}
              style={{ display: "grid", gap: "1rem", maxWidth: "32rem" }}
            >
              <h2>Change temporary password</h2>
              <label>
                Current password
                <input
                  name="current_password"
                  type="password"
                  required
                  style={fieldStyle}
                />
              </label>
              <label>
                New password
                <input
                  name="new_password"
                  type="password"
                  minLength={14}
                  required
                  style={fieldStyle}
                />
              </label>
              <label>
                Confirm new password
                <input
                  name="confirmation"
                  type="password"
                  minLength={14}
                  required
                  style={fieldStyle}
                />
              </label>
              <button className="button button--primary" type="submit">
                Change password
              </button>
            </form>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <p>
                  Signed in as <strong>{staff.display_name}</strong> ·{" "}
                  {staff.role}
                </p>
                <button
                  className="button"
                  onClick={async () => {
                    await logoutStaff();
                    setStaff(null);
                  }}
                >
                  Sign out
                </button>
              </div>
              {staff.role === "admin" && (
                <>
                  <AdminOverview
                    content={content}
                    visibleContent={visibleContent}
                    staffAccounts={staffAccounts}
                    auditLog={auditLog}
                    contentStatus={contentStatus}
                    onContentStatusChange={setContentStatus}
                  />
                  <ProfessionalAccountsAdmin
                    accounts={professionalAccounts}
                    auditLog={professionalAudit}
                    onUpdate={manageProfessionalAccount}
                  />
                </>
              )}
              <section aria-labelledby="moderation-queue-heading">
                <h2 id="moderation-queue-heading">Pending moderation queue</h2>
                {queue.length === 0 ? (
                  <p>No pending or flagged community content.</p>
                ) : (
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {queue.map((item) => (
                      <article className="card" key={item.target_id}>
                        <p className="eyebrow">
                          {item.target_type} · {item.status}
                        </p>
                        <h3>{item.summary}</h3>
                        <p>Pseudonym: {item.username}</p>
                        <code>{item.target_id}</code>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "2rem",
                }}
              >
                <form
                  onSubmit={moderate}
                  style={{ display: "grid", gap: "1rem" }}
                >
                  <h2>Moderate content</h2>
                  <label>
                    Content type
                    <select name="target_type" style={fieldStyle}>
                      <option value="report">Report</option>
                      <option value="comment">Comment</option>
                    </select>
                  </label>
                  <label>
                    Record ID
                    <input name="target_id" required style={fieldStyle} />
                  </label>
                  <label>
                    Action
                    <select name="action" style={fieldStyle}>
                      <option value="approve">Approve</option>
                      <option value="flag">Flag</option>
                      <option value="hide">Hide</option>
                      <option value="restore">Restore</option>
                    </select>
                  </label>
                  <label>
                    Reason
                    <textarea
                      name="reason"
                      minLength={10}
                      required
                      style={fieldStyle}
                    />
                  </label>
                  <button className="button button--primary" type="submit">
                    Apply audited action
                  </button>
                </form>
                {staff.role === "admin" && (
                  <form
                    onSubmit={addModerator}
                    style={{ display: "grid", gap: "1rem" }}
                  >
                    <h2>Create moderator</h2>
                    <label>
                      Staff name
                      <input name="display_name" required style={fieldStyle} />
                    </label>
                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        required
                        style={fieldStyle}
                      />
                    </label>
                    <label>
                      Temporary password
                      <input
                        name="temporary_password"
                        type="password"
                        minLength={14}
                        required
                        style={fieldStyle}
                      />
                    </label>
                    <button className="button button--primary" type="submit">
                      Create moderator
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}
        </section>
      </main>
      <PageFooter />
    </>
  );
}
