"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  fetchModerationAuditLog,
  ModerationAuditRecord,
} from "@/lib/community-api";

export function ModerationLogContent() {
  const [auditLog, setAuditLog] = useState<ModerationAuditRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchModerationAuditLog().then((records) => {
      setAuditLog(records);
      setLoaded(true);
    });
  }, []);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">PUBLIC AUDIT LOG · RULE #8</p>
          <h1>Public Moderation Audit Trail</h1>
          <p className="lede">
            Every moderation decision is recorded with its reason and
            content-state change. Staff identities remain private; authenticated
            staff accountability is retained internally.
          </p>
          <Link href="/community">← Back to Community Hub</Link>
        </header>
        <section className="section shell">
          <div className="section-heading">
            <h2>Audit log entries</h2>
          </div>
          {!loaded ? (
            <p>Loading the audit record…</p>
          ) : auditLog.length === 0 ? (
            <p>No moderation actions have been recorded.</p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {auditLog.map((record) => (
                <article className="card" key={record.id}>
                  <p className="eyebrow">
                    {record.action} · {record.target_type}
                  </p>
                  <h3>{record.moderator_id}</h3>
                  <p>{record.reason}</p>
                  <p>
                    <strong>State:</strong>{" "}
                    {String(record.previous_state?.status ?? "none")} →{" "}
                    {String(record.new_state?.status ?? "none")}
                  </p>
                  <small>{new Date(record.created_at).toLocaleString()}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <PageFooter />
    </>
  );
}
