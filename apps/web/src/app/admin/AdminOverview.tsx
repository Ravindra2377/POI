import {
  AdminCommunityContent,
  StaffAccount,
  StaffAuditRecord,
} from "@/lib/staff-api";

const selectStyle = {
  minWidth: "12rem",
  padding: "0.7rem",
  border: "1px solid var(--border-color, #cbd5e1)",
  borderRadius: "6px",
} as const;

interface AdminOverviewProps {
  content: AdminCommunityContent[];
  visibleContent: AdminCommunityContent[];
  staffAccounts: StaffAccount[];
  auditLog: StaffAuditRecord[];
  contentStatus: string;
  onContentStatusChange: (status: string) => void;
}

export function AdminOverview({
  content,
  visibleContent,
  staffAccounts,
  auditLog,
  contentStatus,
  onContentStatusChange,
}: AdminOverviewProps) {
  const metrics: Array<[string, number]> = [
    ["Content loaded", content.length],
    [
      "Pending",
      content.filter((item) => item.status === "pending_review").length,
    ],
    ["Flagged", content.filter((item) => item.status === "flagged").length],
    ["Published", content.filter((item) => item.status === "published").length],
    ["Hidden", content.filter((item) => item.status === "hidden").length],
    ["Staff", staffAccounts.length],
  ];

  return (
    <section aria-labelledby="administrator-overview-heading">
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="eyebrow">ADMINISTRATOR · FULL PLATFORM CONTROL</p>
        <h2 id="administrator-overview-heading">Administrator overview</h2>
        <p>
          This protected view includes every community-content state, staff
          accounts, and recent audited decisions. Citizen identities remain
          pseudonymous and precise locations are never shown.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        {metrics.map(([label, value]) => (
          <article className="card" key={label}>
            <p className="eyebrow">{label}</p>
            <strong style={{ fontSize: "1.75rem" }}>{value}</strong>
          </article>
        ))}
      </div>

      <section aria-labelledby="content-inventory-heading">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 id="content-inventory-heading">All community content</h2>
            <p>Up to 200 most recent reports and comments.</p>
          </div>
          <label>
            Status filter
            <select
              aria-label="Status filter"
              value={contentStatus}
              onChange={(event) => onContentStatusChange(event.target.value)}
              style={selectStyle}
            >
              <option value="all">All statuses</option>
              <option value="pending_review">Pending review</option>
              <option value="flagged">Flagged</option>
              <option value="published">Published</option>
              <option value="hidden">Hidden</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        {visibleContent.length === 0 ? (
          <p>No community content matches this filter.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {visibleContent.map((item) => (
              <article
                className="card"
                key={`${item.target_type}-${item.target_id}`}
              >
                <p className="eyebrow">
                  {item.target_type} · {item.status} ·{" "}
                  {item.classification.replace("_", " ")}
                </p>
                <h3>{item.summary_en}</h3>
                {item.summary_te && <p lang="te">{item.summary_te}</p>}
                {item.detail_en && <p>{item.detail_en}</p>}
                {item.detail_te && <p lang="te">{item.detail_te}</p>}
                <p>Pseudonym: {item.username}</p>
                <code>{item.target_id}</code>
                <small style={{ display: "block", marginTop: "0.5rem" }}>
                  {new Date(item.created_at).toLocaleString()}
                </small>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        aria-labelledby="staff-directory-heading"
        style={{ marginTop: "2rem" }}
      >
        <h2 id="staff-directory-heading">Staff directory</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {staffAccounts.map((account) => (
            <article className="card" key={account.id}>
              <p className="eyebrow">
                {account.role} · {account.is_active ? "active" : "disabled"}
              </p>
              <h3>{account.display_name}</h3>
              <p>{account.email}</p>
              <small>
                {account.must_change_password
                  ? "Temporary password change required"
                  : "Password active"}
              </small>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="admin-audit-heading"
        style={{ margin: "2rem 0" }}
      >
        <h2 id="admin-audit-heading">Recent audited actions</h2>
        {auditLog.length === 0 ? (
          <p>No moderation actions have been recorded.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {auditLog.slice(0, 10).map((record) => (
              <article className="card" key={record.id}>
                <p className="eyebrow">
                  {record.action} · {record.target_type}
                </p>
                <h3>{record.moderator_id}</h3>
                <p>{record.reason}</p>
                <small>{new Date(record.created_at).toLocaleString()}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
