"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CommunityComment,
  CommunityPoll,
  CommunityReport,
  fetchCommunityComments,
  fetchCommunityPolls,
  fetchCommunityReports,
  submitCommunityComment,
  submitCommunityReport,
  submitPollVote,
} from "@/lib/community-api";

const copy = {
  en: {
    eyebrow: "CIVIC PULSE & COMMUNITY HUB",
    title: "Anonymous Field Reality & Citizen Observations",
    intro:
      "Participate anonymously in topic polls, file ground observations, and review public services—with total separation from official government records.",
    pollsHeading: "Civic Pulse Polls",
    voteBtn: "Submit Vote",
    votedMsg: "Vote recorded anonymously!",
    reportHeading: "Ground Field Observations",
    logReportBtn: "+ Log Field Observation",
    reportModalTitle: "Log a Citizen Field Observation",
    titlePlaceholder: "Observation Title (e.g. Delayed Mandal Disbursement)",
    descPlaceholder: "Describe what you observed on the ground...",
    entityTypeLabel: "Entity Category",
    evidenceLabel: "Evidence URL (Optional photo/doc link)",
    submitReportBtn: "Submit Observation",
    closeBtn: "Close",
    commentsHeading: "Community Field Reviews & Experiences",
    commentBtn: "+ Write a Field Review",
    commentModalTitle: "Write a Service / Project Review",
    commentPlaceholder: "Share your field experience or service feedback...",
    ratingLabel: "Rating (1 to 5 stars)",
    submitCommentBtn: "Post Review",
    modLogNotice:
      "All moderation actions produce an open, immutable audit log.",
    modLogLink: "View Moderation Audit Log",
  },
  te: {
    eyebrow: "సివిక్ పల్స్ & కమ్యూనిటీ హబ్",
    title: "అనామక క్షేత్ర వాస్తవికత & పౌరుల పరిశీలనలు",
    intro:
      "అంశం ఓట్లలో అనామకంగా భాగస్వామ్యం వహించండి, క్షేత్ర పరిశీలనలను నమోదు చేయండి మరియు ప్రజా సేవలను సమీక్షించండి—అధికారిక ప్రభుత్వ రికార్డుల నుండి పూర్తిగా వేరుగా.",
    pollsHeading: "సివిక్ పల్స్ ఓట్లు",
    voteBtn: "ఓటు సమర్పించండి",
    votedMsg: "ఓటు అనామకంగా నమోదు చేయబడింది!",
    reportHeading: "క్షేత్ర పరిశీలనలు",
    logReportBtn: "+ క్షేత్ర పరిశీలనను నమోదు చేయండి",
    reportModalTitle: "పౌర క్షేత్ర పరిశీలనను నమోదు చేయండి",
    titlePlaceholder: "పరిశీలన శీర్షిక (ఉదా. మందగించిన మండల నిధుల విడుదల)",
    descPlaceholder: "మీరు క్షేత్రస్థాయిలో ఏమి గమనించారో వివరించండి...",
    entityTypeLabel: "విభాగం వర్గం",
    evidenceLabel: "ఆధారం URL (ఐచ్ఛిక ఫోటో/డాక్యుమెంట్ లింక్)",
    submitReportBtn: "పరిశీలనను సమర్పించండి",
    closeBtn: "మూసివేయి",
    commentsHeading: "కమ్యూనిటీ క్షేత్ర సమీక్షలు & అనుభవాలు",
    commentBtn: "+ క్షేత్ర సమీక్షను రాయండి",
    commentModalTitle: "సేవ / ప్రాజెక్ట్ సమీక్షను రాయండి",
    commentPlaceholder:
      "మీ క్షేత్ర అనుభవాన్ని లేదా సేవా అభిప్రాయాన్ని పంచుకోండి...",
    ratingLabel: "రేటింగ్ (1 నుండి 5 నక్షత్రాలు)",
    submitCommentBtn: "సమీక్షను పోస్ట్ చేయండి",
    modLogNotice: "అన్ని మోడరేషన్ చర్యలు పారదర్శక ఆడిట్ లాగ్‌ను సృష్టిస్తాయి.",
    modLogLink: "మోడరేషన్ ఆడిట్ లాగ్‌ను వీక్షించండి",
  },
} as const;

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function CommunityContent() {
  const { locale } = useLocale();
  const labels = getCopyLabels(copy, locale);

  const [polls, setPolls] = useState<CommunityPoll[]>([]);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<Record<string, string>>(
    {},
  );
  const [votedPolls, setVotedPolls] = useState<Record<string, boolean>>({});

  // Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);

  // Form inputs
  const [reportTitle, setReportTitle] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportEntityType, setReportEntityType] = useState("scheme");
  const [reportEvidence, setReportEvidence] = useState("");

  const [commentContent, setCommentContent] = useState("");
  const [commentRating, setCommentRating] = useState(5);
  const [commentTargetType] = useState("scheme");
  const [commentTargetId] = useState("general");

  useEffect(() => {
    fetchCommunityPolls().then(setPolls);
    fetchCommunityReports().then(setReports);
    fetchCommunityComments().then(setComments);
  }, []);

  const handleVote = async (pollId: string) => {
    const optionId = selectedVotes[pollId];
    if (!optionId) return;
    try {
      const updated = await submitPollVote(pollId, "anonymous_user", optionId);
      setPolls((prev) => prev.map((p) => (p.id === pollId ? updated : p)));
      setVotedPolls((prev) => ({ ...prev, [pollId]: true }));
    } catch {
      // fallback
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle || !reportDesc) return;
    try {
      const newRep = await submitCommunityReport({
        username: "anonymous_citizen",
        entity_type: reportEntityType,
        title_en: reportTitle,
        description_en: reportDesc,
        evidence_urls: reportEvidence ? [reportEvidence] : [],
      });
      setReports((prev) => [newRep, ...prev]);
      setShowReportModal(false);
      setReportTitle("");
      setReportDesc("");
      setReportEvidence("");
    } catch {
      // ignore
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent) return;
    try {
      const newComm = await submitCommunityComment({
        username: "anonymous_citizen",
        target_type: commentTargetType,
        target_id: commentTargetId,
        rating: commentRating,
        content_en: commentContent,
      });
      setComments((prev) => [newComm, ...prev]);
      setShowCommentModal(false);
      setCommentContent("");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
        </header>

        {/* SECTION 1: CIVIC PULSE POLLS */}
        <section className="section shell" aria-labelledby="polls-heading">
          <div className="section-heading">
            <h2 id="polls-heading">{labels.pollsHeading}</h2>
          </div>

          <div style={{ display: "grid", gap: "1.5rem" }}>
            {polls.map((poll) => (
              <div
                key={poll.id}
                style={{
                  padding: "1.5rem",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color, #e5e7eb)",
                  background: "var(--bg-surface, #ffffff)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    className="status-label"
                    data-state="reviewed"
                    style={{ textTransform: "uppercase", fontSize: "0.75rem" }}
                  >
                    CIVIC PULSE · {poll.entity_type}
                  </span>
                  <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                    Total Votes: <strong>{poll.total_votes}</strong>
                  </span>
                </div>

                <h3
                  lang={locale}
                  style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}
                >
                  {locale === "te" && poll.title_te
                    ? poll.title_te
                    : poll.title_en}
                </h3>
                <p style={{ opacity: 0.85, marginBottom: "1rem" }}>
                  {locale === "te" && poll.description_te
                    ? poll.description_te
                    : poll.description_en}
                </p>

                {/* Mandated Rule #5 Legal Disclaimer */}
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(234, 179, 8, 0.12)",
                    borderLeft: "4px solid #eab308",
                    fontSize: "0.825rem",
                    fontWeight: "500",
                    marginBottom: "1.25rem",
                  }}
                >
                  ⚠️ <strong>Non-Representative Disclaimer:</strong>{" "}
                  {poll.non_representative_disclaimer}
                </div>

                {/* Poll Options */}
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {poll.options.map((opt) => {
                    const percentage =
                      poll.total_votes > 0
                        ? Math.round((opt.vote_count / poll.total_votes) * 100)
                        : 0;
                    return (
                      <div
                        key={opt.id}
                        style={{
                          display: "grid",
                          gap: "0.25rem",
                          cursor: "pointer",
                        }}
                        onClick={() =>
                          setSelectedVotes((prev) => ({
                            ...prev,
                            [poll.id]: opt.id,
                          }))
                        }
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.95rem",
                          }}
                        >
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={`poll_${poll.id}`}
                              checked={selectedVotes[poll.id] === opt.id}
                              onChange={() =>
                                setSelectedVotes((prev) => ({
                                  ...prev,
                                  [poll.id]: opt.id,
                                }))
                              }
                            />
                            <span>
                              {locale === "te" && opt.label_te
                                ? opt.label_te
                                : opt.label_en}
                            </span>
                          </label>
                          <span style={{ fontWeight: "600" }}>
                            {percentage}% ({opt.vote_count})
                          </span>
                        </div>
                        <div
                          style={{
                            width: "100%",
                            height: "8px",
                            background: "#e5e7eb",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${percentage}%`,
                              height: "100%",
                              background:
                                selectedVotes[poll.id] === opt.id
                                  ? "var(--primary-color, #2563eb)"
                                  : "#9ca3af",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    marginTop: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <button
                    className="button button--primary"
                    onClick={() => handleVote(poll.id)}
                    disabled={!selectedVotes[poll.id] || votedPolls[poll.id]}
                    style={{ padding: "0.5rem 1.25rem" }}
                  >
                    {labels.voteBtn}
                  </button>
                  {votedPolls[poll.id] && (
                    <span
                      style={{
                        color: "var(--success-color, #10b981)",
                        fontWeight: "600",
                        fontSize: "0.9rem",
                      }}
                    >
                      ✓ {labels.votedMsg}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: GROUND FIELD OBSERVATIONS */}
        <section className="section shell" aria-labelledby="reports-heading">
          <div
            className="section-heading section-heading--split"
            style={{ alignItems: "center" }}
          >
            <div>
              <h2 id="reports-heading">{labels.reportHeading}</h2>
            </div>
            <button
              className="button button--primary"
              onClick={() => setShowReportModal(true)}
            >
              {labels.logReportBtn}
            </button>
          </div>

          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            {reports.length === 0 ? (
              <p style={{ opacity: 0.7 }}>
                No field observations reported yet. Be the first to submit!
              </p>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  style={{
                    padding: "1.25rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    background: "var(--bg-surface, #fff)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        padding: "0.2rem 0.6rem",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      Community-Reported
                    </span>
                    <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                      By {rep.username || "Anonymous Citizen"} ·{" "}
                      {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>
                    {rep.title_en}
                  </h3>
                  <p
                    style={{
                      opacity: 0.85,
                      fontSize: "0.95rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {rep.description_en}
                  </p>

                  {rep.evidence_urls && rep.evidence_urls.length > 0 && (
                    <div style={{ fontSize: "0.85rem" }}>
                      📎 <strong>Attached Evidence:</strong>{" "}
                      <a
                        href={rep.evidence_urls[0]}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--primary-color, #2563eb)" }}
                      >
                        View Field Document / Photo
                      </a>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION 3: COMMUNITY FIELD REVIEWS & COMMENTS */}
        <section className="section shell" aria-labelledby="comments-heading">
          <div
            className="section-heading section-heading--split"
            style={{ alignItems: "center" }}
          >
            <div>
              <h2 id="comments-heading">{labels.commentsHeading}</h2>
            </div>
            <button
              className="button button--secondary"
              onClick={() => setShowCommentModal(true)}
            >
              {labels.commentBtn}
            </button>
          </div>

          <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
            {comments.length === 0 ? (
              <p style={{ opacity: 0.7 }}>No field reviews submitted yet.</p>
            ) : (
              comments.map((comm) => (
                <div
                  key={comm.id}
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    background: "var(--bg-surface, #fff)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.35rem",
                    }}
                  >
                    <span style={{ fontWeight: "600" }}>
                      {comm.username || "Anonymous Citizen"}
                    </span>
                    {comm.rating && (
                      <span style={{ color: "#f59e0b", fontWeight: "700" }}>
                        {"★".repeat(comm.rating)}
                        {"☆".repeat(5 - comm.rating)}
                      </span>
                    )}
                  </div>
                  <p style={{ opacity: 0.9, fontSize: "0.95rem" }}>
                    {comm.content_en}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION 4: TRANSPARENT MODERATION LINK */}
        <section className="section section--tinted">
          <div
            className="shell"
            style={{ textAlign: "center", padding: "2rem 1rem" }}
          >
            <p className="eyebrow">RULE #8 TRANSPARENCY</p>
            <h3>{labels.modLogNotice}</h3>
            <Link
              href="/community/moderation-log"
              className="button button--secondary"
              style={{ marginTop: "1rem", display: "inline-block" }}
            >
              {labels.modLogLink} →
            </Link>
          </div>
        </section>

        {/* MODAL 1: REPORT MODAL */}
        {showReportModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "var(--bg-surface, #fff)",
                padding: "2rem",
                borderRadius: "12px",
                maxWidth: "500px",
                width: "100%",
              }}
            >
              <h3>{labels.reportModalTitle}</h3>
              <form
                onSubmit={handleCreateReport}
                style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {labels.entityTypeLabel}
                  </label>
                  <select
                    value={reportEntityType}
                    onChange={(e) => setReportEntityType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                    }}
                  >
                    <option value="scheme">Government Scheme</option>
                    <option value="project">Infrastructure Project</option>
                    <option value="officeholder">
                      Public Officeholder / Office
                    </option>
                    <option value="general">
                      General Mandal / City Service
                    </option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder={labels.titlePlaceholder}
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />

                <textarea
                  placeholder={labels.descPlaceholder}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={4}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />

                <input
                  type="url"
                  placeholder={labels.evidenceLabel}
                  value={reportEvidence}
                  onChange={(e) => setReportEvidence(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "flex-end",
                    marginTop: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => setShowReportModal(false)}
                  >
                    {labels.closeBtn}
                  </button>
                  <button type="submit" className="button button--primary">
                    {labels.submitReportBtn}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: COMMENT MODAL */}
        {showCommentModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "var(--bg-surface, #fff)",
                padding: "2rem",
                borderRadius: "12px",
                maxWidth: "500px",
                width: "100%",
              }}
            >
              <h3>{labels.commentModalTitle}</h3>
              <form
                onSubmit={handleCreateComment}
                style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {labels.ratingLabel}
                  </label>
                  <select
                    value={commentRating}
                    onChange={(e) => setCommentRating(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                    }}
                  >
                    <option value={5}>★★★★★ (5 Stars - Excellent)</option>
                    <option value={4}>★★★★☆ (4 Stars - Good)</option>
                    <option value={3}>★★★☆☆ (3 Stars - Average)</option>
                    <option value={2}>★★☆☆☆ (2 Stars - Poor)</option>
                    <option value={1}>★☆☆☆☆ (1 Star - Critical Issue)</option>
                  </select>
                </div>

                <textarea
                  placeholder={labels.commentPlaceholder}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={4}
                  required
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "flex-end",
                    marginTop: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => setShowCommentModal(false)}
                  >
                    {labels.closeBtn}
                  </button>
                  <button type="submit" className="button button--primary">
                    {labels.submitCommentBtn}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <PageFooter />
    </>
  );
}
