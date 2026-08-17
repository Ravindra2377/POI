"use client";

import { useState } from "react";
import type { CivicEntityType } from "./CivicPosterCard";
import styles from "./LogCivicActionModal.module.css";

export interface LogCivicActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntity?: { id: string; title: string; type: CivicEntityType };
}

const ACTION_OPTIONS: Record<CivicEntityType | "general", string[]> = {
  scheme: [
    "Applied for Benefit",
    "Received Benefit",
    "Application Under Review",
    "Grievance Reported",
  ],
  project: [
    "Field Work Underway",
    "Completed Verification",
    "Delayed / Halted",
    "Quality Issue Observed",
  ],
  officeholder: [
    "Constituent Meeting / Petition Submitted",
    "Public Speech / Policy Announcement",
    "Assembly Debate Attended",
  ],
  procurement: [
    "Tender Document Inspected",
    "Bid Award Verified",
    "Contract Execution Tracked",
  ],
  budget: [
    "Budget Allocation Tracked",
    "Disbursement Verified",
    "Fund Utilization Inquiry",
  ],
  general: [
    "Public Infrastructure Observation",
    "Civic Service Experience",
    "Community Query",
  ],
};

export function LogCivicActionModal({
  isOpen,
  onClose,
  initialEntity,
}: LogCivicActionModalProps) {
  const [entityTitle, setEntityTitle] = useState(initialEntity?.title ?? "");
  const [entityType, setEntityType] = useState<CivicEntityType>(
    initialEntity?.type ?? "scheme",
  );
  const [actionStatus, setActionStatus] = useState("");
  const [district, setDistrict] = useState("Andhra Pradesh");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentOptions = ACTION_OPTIONS[entityType] ?? ACTION_OPTIONS.general;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1800);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleGroup}>
            <h2 className={styles.modalTitle}>Log Civic Interaction</h2>
            <p className={styles.modalSubtitle}>
              Record a public observation, scheme application, or project status
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {submitted ? (
          <div className={styles.modalBody}>
            <div className={styles.successMessage}>
              ✓ Civic action recorded! Audit trace registered under Community
              Reported provenance.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="entityType">
                  Civic Entity Category
                </label>
                <select
                  id="entityType"
                  className={styles.select}
                  value={entityType}
                  onChange={(e) =>
                    setEntityType(e.target.value as CivicEntityType)
                  }
                >
                  <option value="scheme">Welfare Scheme</option>
                  <option value="project">Infrastructure Project</option>
                  <option value="officeholder">
                    Legislative Officeholder / MLA
                  </option>
                  <option value="procurement">e-Procurement Tender</option>
                  <option value="budget">Budget Allocation</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="entityTitle">
                  Subject / Project / Scheme Title
                </label>
                <input
                  id="entityTitle"
                  type="text"
                  required
                  className={styles.input}
                  placeholder="e.g. Polavaram Project, NTR Bharosa Scheme..."
                  value={entityTitle}
                  onChange={(e) => setEntityTitle(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="actionStatus">
                  Action Status / Observation
                </label>
                <select
                  id="actionStatus"
                  required
                  className={styles.select}
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                >
                  <option value="">Select status / outcome...</option>
                  {currentOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="district">
                  District / Location
                </label>
                <input
                  id="district"
                  type="text"
                  className={styles.input}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Guntur, Visakhapatnam, Eluru..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="notes">
                  Observation Details / Notes
                </label>
                <textarea
                  id="notes"
                  className={styles.textarea}
                  placeholder="Provide context, dates, or specific field observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className={styles.auditNotice}>
                <strong>Audited Community Observation:</strong> Your entry will
                be published with a visible <em>Community Reported</em> badge
                and audit trace. It is never presented as official government
                data or a representative poll.
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
              >
                Cancel
              </button>
              <button type="submit" className={styles.submitButton}>
                Publish Log Entry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
