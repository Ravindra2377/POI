"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { saveAnonymousUser } from "@/lib/community-api";
import styles from "./account.module.css";

const DISTRICTS = [
  "All Andhra Pradesh",
  "Ananthapuramu",
  "Chittoor",
  "East Godavari",
  "Guntur",
  "Kadapa",
  "Krishna",
  "Kurnool",
  "Nellore",
  "Prakasam",
  "Srikakulam",
  "Visakhapatnam",
  "Vizianagaram",
  "West Godavari",
];

const copy = {
  en: {
    eyebrow: "ANONYMOUS CITIZEN PROFILE",
    title: "Zero-Tracking Citizen Participation",
    intro:
      "No login, no passwords, and no personal data stored. Your identity is 100% pseudonymous and protected.",
    privacy: "Privacy Guarantee & Consent Boundary",
    privacyText:
      "We collect no emails, mobile numbers, or precise GPS coordinates. Your pseudonymous profile is tied only to your voluntary district preference.",
    profileHeading: "Your Pseudonymous Profile",
    handleLabel: "Pseudonymous Handle / Citizen ID",
    districtLabel: "Selected District Jurisdiction",
    consentSharing: "Allow anonymous data aggregation for civic insights",
    consentActivity: "Make my filed observations visible to the community",
    saveBtn: "Save Anonymous Profile",
    savedMsg: "Anonymous profile settings saved locally!",
    moderationHeading: "Admin & Moderation Integrity",
    moderationText:
      "All moderation on platform observations is conducted by verified moderators. Every action produces an open, immutable audit log.",
    modLogLink: "View Public Moderation Audit Log",
  },
  te: {
    eyebrow: "అనామక పౌర వివరాలు",
    title: "జీరో-ట్రాకింగ్ పౌర భాగస్వామ్యం",
    intro:
      "లాగిన్ లేదు, పాస్‌వర్డ్‌లు లేవు మరియు వ్యక్తిగత డేటా నిల్వ చేయబడదు. మీ గుర్తింపు 100% అనామకం మరియు సురక్షితం.",
    privacy: "గోప్యతా హామీ & సమ్మతి సరిహద్దు",
    privacyText:
      "మేము ఎటువంటి ఇమెయిల్‌లు, మొబైల్ నంబర్‌లు లేదా ఖచ్చితమైన GPS స్థానాలను సేకరించము. మీ అనామక ప్రొఫైల్ మీ స్వచ్ఛంద జిల్లా ప్రాధాన్యతకు మాత్రమే కట్టుబడి ఉంటుంది.",
    profileHeading: "మీ అనామక ప్రొఫైల్",
    handleLabel: "అనామక పేరు / సిటిజన్ ఐడి",
    districtLabel: "ఎంచుకున్న జిల్లా పరిధి",
    consentSharing: "పౌర సమాచారం కోసం అనామక డేటా ఏకీకరణకు అనుమతించండి",
    consentActivity: "నా నమోదు పరిశీలనలను కమ్యూనిటీకి కనిపించేలా చేయండి",
    saveBtn: "అనామక ప్రొఫైల్‌ను సేవ్ చేయండి",
    savedMsg: "అనామక ప్రొఫైల్ సెట్టింగ్‌లు స్థానికంగా సేవ్ చేయబడ్డాయి!",
    moderationHeading: "అడ్మిన్ & మోడరేషన్ సమగ్రత",
    moderationText:
      "ప్లాట్‌ఫారమ్ పరిశీలనలపై అన్ని మోడరేషన్‌లు నిర్ధారించబడిన మోడరేటర్‌లచే నిర్వహించబడతాయి. ప్రతి చర్య పారదర్శక ఆడిట్ రికార్డును సృష్టిస్తుంది.",
    modLogLink: "పబ్లిక్ మోడరేషన్ ఆడిట్ లాగ్‌ను వీక్షించండి",
  },
} as const;

function loadStoredProfile() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("ap_citizen_profile");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function AccountContent() {
  const { locale } = useLocale();
  const labels = copy[locale];

  const [username] = useState(() => {
    const stored = loadStoredProfile();
    return stored?.username || "citizen_4819";
  });

  const [displayName, setDisplayName] = useState(() => {
    const stored = loadStoredProfile();
    return stored?.displayName || "Anonymous Citizen";
  });

  const [district, setDistrict] = useState(() => {
    const stored = loadStoredProfile();
    return stored?.district || "All Andhra Pradesh";
  });

  const [consentDataSharing, setConsentDataSharing] = useState(() => {
    const stored = loadStoredProfile();
    return typeof stored?.consentDataSharing === "boolean"
      ? stored.consentDataSharing
      : true;
  });

  const [consentPublicActivity, setConsentPublicActivity] = useState(() => {
    const stored = loadStoredProfile();
    return typeof stored?.consentPublicActivity === "boolean"
      ? stored.consentPublicActivity
      : true;
  });

  const [savedStatus, setSavedStatus] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const profile = {
      username,
      displayName,
      district,
      consentDataSharing,
      consentPublicActivity,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("ap_citizen_profile", JSON.stringify(profile));
    }

    try {
      await saveAnonymousUser({
        username,
        display_name: displayName,
        consent_data_sharing: consentDataSharing,
        consent_public_activity: consentPublicActivity,
        preferred_language: locale,
      });
    } catch {
      // safe fallback
    }

    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 3000);
  };

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
          <aside className={styles.notice} aria-label={labels.privacy}>
            <strong>{labels.privacy}</strong>
            <p>{labels.privacyText}</p>
          </aside>
        </header>

        <section className="section shell">
          <div className="section-heading">
            <h2>{labels.profileHeading}</h2>
          </div>

          <form
            onSubmit={handleSave}
            style={{ maxWidth: "600px", display: "grid", gap: "1.25rem" }}
          >
            <div>
              <label
                htmlFor="citizen-handle"
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {labels.handleLabel}
              </label>
              <input
                id="citizen-handle"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #ccc)",
                  background: "var(--bg-surface, #fff)",
                }}
              />
              <span
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.7,
                  marginTop: "0.25rem",
                  display: "block",
                }}
              >
                Internal ID: <code>{username}</code>
              </span>
            </div>

            <div>
              <label
                htmlFor="citizen-district"
                style={{
                  display: "block",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                {labels.districtLabel}
              </label>
              <select
                id="citizen-district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #ccc)",
                  background: "var(--bg-surface, #fff)",
                }}
              >
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: "0.75rem" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={consentDataSharing}
                  onChange={(e) => setConsentDataSharing(e.target.checked)}
                />
                <span>{labels.consentSharing}</span>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={consentPublicActivity}
                  onChange={(e) => setConsentPublicActivity(e.target.checked)}
                />
                <span>{labels.consentActivity}</span>
              </label>
            </div>

            <button
              type="submit"
              className="button button--primary"
              style={{ padding: "0.75rem 1.5rem", width: "fit-content" }}
            >
              {labels.saveBtn}
            </button>

            {savedStatus && (
              <p
                style={{
                  color: "var(--success-color, #10b981)",
                  fontWeight: "600",
                }}
              >
                ✓ {labels.savedMsg}
              </p>
            )}
          </form>
        </section>

        <section className="section section--tinted">
          <div className="shell">
            <div className={styles.controls}>
              <p className="eyebrow">MODERATION & TRUST</p>
              <h2>{labels.moderationHeading}</h2>
              <p>{labels.moderationText}</p>
              <Link
                href="/community/moderation-log"
                className="button button--secondary"
                style={{ marginTop: "1rem", display: "inline-block" }}
              >
                {labels.modLogLink} →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
