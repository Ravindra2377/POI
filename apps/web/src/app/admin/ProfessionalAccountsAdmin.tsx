"use client";

import { FormEvent, useState } from "react";
import type {
  ProfessionalAccessPlan,
  ProfessionalAccount,
  ProfessionalAuditRecord,
  ProfessionalBillingStatus,
  ProfessionalStatus,
} from "@/lib/professional-api";

const fieldStyle = {
  width: "100%",
  padding: "0.7rem",
  border: "1px solid var(--border-color, #cbd5e1)",
  borderRadius: "6px",
} as const;

type ProfessionalUpdate = {
  status: ProfessionalStatus;
  access_plan: ProfessionalAccessPlan;
  billing_status: ProfessionalBillingStatus;
  reason: string;
};

interface ProfessionalAccountsAdminProps {
  accounts: ProfessionalAccount[];
  auditLog: ProfessionalAuditRecord[];
  onUpdate: (accountId: string, update: ProfessionalUpdate) => Promise<void>;
}

export function ProfessionalAccountsAdmin({
  accounts,
  auditLog,
  onUpdate,
}: ProfessionalAccountsAdminProps) {
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  async function submitUpdate(
    event: FormEvent<HTMLFormElement>,
    accountId: string,
  ) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSavingId(accountId);
    setError("");
    try {
      await onUpdate(accountId, {
        status: String(data.get("status")) as ProfessionalStatus,
        access_plan: String(data.get("access_plan")) as ProfessionalAccessPlan,
        billing_status: String(
          data.get("billing_status"),
        ) as ProfessionalBillingStatus,
        reason: String(data.get("reason")),
      });
      event.currentTarget.reset();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Account update failed",
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <section aria-labelledby="professional-accounts-heading">
      <div className="card" style={{ margin: "2rem 0 1.5rem" }}>
        <p className="eyebrow">ADMINISTRATOR · PROFESSIONAL ACCESS</p>
        <h2 id="professional-accounts-heading">
          Professional customer accounts
        </h2>
        <p>
          Administrators can review every professional account and control its
          plan, manual billing state and access. Customers never receive staff
          or citizen authority. Every change is audited and revokes active
          customer sessions.
        </p>
      </div>

      {accounts.length === 0 ? (
        <p>No professional accounts have registered.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {accounts.map((account) => (
            <article className="card" key={account.id}>
              <p className="eyebrow">
                {account.status.replaceAll("_", " ")} ·{" "}
                {account.billing_status.replaceAll("_", " ")} ·{" "}
                {account.access_plan}
              </p>
              <h3>{account.organization_name}</h3>
              <p>
                {account.display_name} · {account.email}
              </p>
              <p>
                Requested plan: <strong>{account.requested_plan}</strong> ·
                Email:{" "}
                <strong>
                  {account.email_verified_at ? "verified" : "not verified"}
                </strong>
              </p>
              {account.status === "pending_verification" ? (
                <p>
                  Access controls remain locked until the customer verifies
                  email ownership.
                </p>
              ) : (
                <form
                  aria-label={`Manage ${account.organization_name}`}
                  onSubmit={(event) => submitUpdate(event, account.id)}
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    marginTop: "1rem",
                  }}
                >
                  <label>
                    Account status
                    <select
                      name="status"
                      defaultValue={account.status}
                      style={fieldStyle}
                    >
                      <option value="pending_review">Pending review</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label>
                    Access plan
                    <select
                      name="access_plan"
                      defaultValue={account.access_plan}
                      style={fieldStyle}
                    >
                      <option value="none">No paid access</option>
                      <option value="professional">Professional</option>
                      <option value="organization">Organisation</option>
                    </select>
                  </label>
                  <label>
                    Manual billing state
                    <select
                      name="billing_status"
                      defaultValue={account.billing_status}
                      style={fieldStyle}
                    >
                      <option value="not_started">Not started</option>
                      <option value="payment_pending">Payment pending</option>
                      <option value="paid">Paid</option>
                      <option value="past_due">Past due</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="complimentary">Complimentary</option>
                    </select>
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Audited reason
                    <textarea
                      name="reason"
                      minLength={10}
                      required
                      style={fieldStyle}
                    />
                  </label>
                  <button
                    className="button button--primary"
                    disabled={savingId === account.id}
                    type="submit"
                  >
                    {savingId === account.id
                      ? "Saving audited change…"
                      : "Save account access"}
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}

      <section
        aria-labelledby="professional-audit-heading"
        style={{ margin: "2rem 0" }}
      >
        <h2 id="professional-audit-heading">Professional account audit</h2>
        {auditLog.length === 0 ? (
          <p>No professional account changes have been recorded.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {auditLog.slice(0, 10).map((record) => (
              <article className="card" key={record.id}>
                <p className="eyebrow">{record.action.replaceAll("_", " ")}</p>
                <p>{record.reason}</p>
                <code>{record.professional_account_id}</code>
                <small style={{ display: "block", marginTop: "0.5rem" }}>
                  {new Date(record.created_at).toLocaleString()}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
