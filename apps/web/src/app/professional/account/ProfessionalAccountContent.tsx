"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/LocaleProvider";
import {
  fetchProfessionalRegistrationStatus,
  loginProfessionalAccount,
  logoutProfessionalAccount,
  ProfessionalAccount,
  ProfessionalPlan,
  ProfessionalRegistrationStatus,
  registerProfessionalAccount,
  restoreProfessionalSession,
  verifyProfessionalEmail,
} from "@/lib/professional-api";
import styles from "./account.module.css";

const copy = {
  en: {
    eyebrow: "PROFESSIONAL ACCOUNT",
    title: "Verified access for professional research",
    intro:
      "Professional accounts are separate from anonymous citizen participation and restricted staff accounts. Registration does not activate a paid plan.",
    boundaryTitle: "Manual approval and billing",
    boundary:
      "An administrator reviews verified accounts, confirms scope and records either paid or complimentary access. This website does not collect card or bank details yet.",
    dashboard: "Your professional account",
    registration: "Create an account",
    registrationClosed:
      "New professional registrations are temporarily closed.",
    emailUnavailable:
      "Registration is paused because verification email is not configured.",
    signIn: "Professional sign in",
    name: "Your name",
    organization: "Organisation name",
    email: "Work email",
    password: "Password",
    plan: "Requested plan",
    professional: "Professional pilot",
    organisation: "Organisation pilot",
    terms:
      "I accept the professional pilot terms and understand that public records remain free.",
    create: "Create account",
    signInButton: "Sign in",
    signOut: "Sign out",
    checking: "Checking professional session…",
    verifySent:
      "Registration received. Open the verification link sent to your email; the account will then await administrator review.",
    verified:
      "Email verified. Your account is awaiting administrator review and cannot sign in yet.",
    status: "Account status",
    requestedPlan: "Requested plan",
    accessPlan: "Access plan",
    billing: "Billing status",
    noPayment:
      "No payment is collected here. Access changes are made by an administrator and recorded in the audit log.",
  },
  te: {
    eyebrow: "వృత్తిపరమైన ఖాతా",
    title: "వృత్తిపరమైన పరిశోధనకు ధృవీకరించిన ప్రవేశం",
    intro:
      "వృత్తిపరమైన ఖాతాలు అజ్ఞాత పౌర భాగస్వామ్యం మరియు పరిమిత సిబ్బంది ఖాతాల నుండి వేరుగా ఉంటాయి. నమోదు చెల్లింపు ప్లాన్‌ను స్వయంచాలకంగా ప్రారంభించదు.",
    boundaryTitle: "నిర్వాహక సమీక్ష మరియు బిల్లింగ్",
    boundary:
      "నిర్వాహకుడు ధృవీకరించిన ఖాతాను సమీక్షించి, పరిధిని నిర్ధారించి, చెల్లింపు లేదా ఉచిత ప్రవేశాన్ని నమోదు చేస్తారు. ఈ వెబ్‌సైట్ ప్రస్తుతం కార్డు లేదా బ్యాంకు వివరాలను సేకరించదు.",
    dashboard: "మీ వృత్తిపరమైన ఖాతా",
    registration: "ఖాతాను సృష్టించండి",
    registrationClosed:
      "కొత్త వృత్తిపరమైన నమోదులు తాత్కాలికంగా మూసివేయబడ్డాయి.",
    emailUnavailable: "ధృవీకరణ ఇమెయిల్ అమర్చనందున నమోదు నిలిపివేయబడింది.",
    signIn: "వృత్తిపరమైన సైన్ ఇన్",
    name: "మీ పేరు",
    organization: "సంస్థ పేరు",
    email: "కార్యాలయ ఇమెయిల్",
    password: "పాస్‌వర్డ్",
    plan: "అభ్యర్థించిన ప్లాన్",
    professional: "వృత్తిపరమైన పైలట్",
    organisation: "సంస్థ పైలట్",
    terms:
      "వృత్తిపరమైన పైలట్ నిబంధనలను అంగీకరిస్తున్నాను; ప్రజా రికార్డులు ఉచితంగానే ఉంటాయని అర్థం చేసుకున్నాను.",
    create: "ఖాతాను సృష్టించండి",
    signInButton: "సైన్ ఇన్",
    signOut: "సైన్ అవుట్",
    checking: "వృత్తిపరమైన సెషన్‌ను తనిఖీ చేస్తున్నాము…",
    verifySent:
      "నమోదు స్వీకరించబడింది. మీ ఇమెయిల్‌కు పంపిన ధృవీకరణ లింక్‌ను తెరవండి; ఆ తర్వాత నిర్వాహక సమీక్ష కోసం వేచి ఉంటుంది.",
    verified:
      "ఇమెయిల్ ధృవీకరించబడింది. మీ ఖాతా నిర్వాహక సమీక్ష కోసం వేచి ఉంది; ఇంకా సైన్ ఇన్ చేయలేరు.",
    status: "ఖాతా స్థితి",
    requestedPlan: "అభ్యర్థించిన ప్లాన్",
    accessPlan: "ప్రవేశ ప్లాన్",
    billing: "బిల్లింగ్ స్థితి",
    noPayment:
      "ఇక్కడ చెల్లింపు సేకరించబడదు. ప్రవేశ మార్పులను నిర్వాహకుడు చేసి ఆడిట్ లాగ్‌లో నమోదు చేస్తారు.",
  },
} as const;

export function ProfessionalAccountContent() {
  const { locale } = useLocale();
  const labels = locale === "te" ? copy.te : copy.en;
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [account, setAccount] = useState<ProfessionalAccount | null>(null);
  const [registration, setRegistration] =
    useState<ProfessionalRegistrationStatus | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let current = true;
    const verificationToken = searchParams.get("verify");
    if (verificationToken && typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    Promise.all([
      fetchProfessionalRegistrationStatus(),
      restoreProfessionalSession(),
      verificationToken
        ? verifyProfessionalEmail(verificationToken)
        : Promise.resolve(null),
    ])
      .then(([status, restored, verified]) => {
        if (!current) return;
        setRegistration(status);
        setAccount(restored);
        if (verified) setMessage(labels.verified);
      })
      .catch((caught) => {
        if (current) {
          setError(
            caught instanceof Error ? caught.message : "Account check failed",
          );
        }
      })
      .finally(() => {
        if (current) setChecking(false);
      });
    return () => {
      current = false;
    };
  }, [labels.verified, searchParams]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await registerProfessionalAccount({
        display_name: String(data.get("display_name")),
        organization_name: String(data.get("organization_name")),
        email: String(data.get("email")),
        password: String(data.get("password")),
        requested_plan: String(data.get("requested_plan")) as ProfessionalPlan,
      });
      form.reset();
      setMessage(labels.verifySent);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Registration failed",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      setAccount(
        await loginProfessionalAccount(
          String(data.get("email")),
          String(data.get("password")),
        ),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="page-intro shell">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.title}</h1>
        <p className="lede">{labels.intro}</p>
        <aside className={styles.boundary} aria-label={labels.boundaryTitle}>
          <strong>{labels.boundaryTitle}</strong>
          <p>{labels.boundary}</p>
        </aside>
      </header>
      <section className="section shell">
        {checking ? (
          <p>{labels.checking}</p>
        ) : account ? (
          <article className={styles.dashboard}>
            <p className="eyebrow">{account.status.replaceAll("_", " ")}</p>
            <h2>{labels.dashboard}</h2>
            <h3>{account.organization_name}</h3>
            <p>
              {account.display_name} · {account.email}
            </p>
            <dl>
              <div>
                <dt>{labels.status}</dt>
                <dd>{account.status}</dd>
              </div>
              <div>
                <dt>{labels.requestedPlan}</dt>
                <dd>{account.requested_plan}</dd>
              </div>
              <div>
                <dt>{labels.accessPlan}</dt>
                <dd>{account.access_plan}</dd>
              </div>
              <div>
                <dt>{labels.billing}</dt>
                <dd>{account.billing_status}</dd>
              </div>
            </dl>
            <p>{labels.noPayment}</p>
            <button
              className="button"
              type="button"
              onClick={async () => {
                await logoutProfessionalAccount();
                setAccount(null);
              }}
            >
              {labels.signOut}
            </button>
          </article>
        ) : (
          <div className={styles.forms}>
            <section aria-labelledby="professional-register-heading">
              <h2 id="professional-register-heading">{labels.registration}</h2>
              {!registration?.registration_enabled ? (
                <p role="status">{labels.registrationClosed}</p>
              ) : !registration.email_verification_available ? (
                <p role="status">{labels.emailUnavailable}</p>
              ) : (
                <form onSubmit={register}>
                  <label>
                    {labels.name}
                    <input name="display_name" required minLength={2} />
                  </label>
                  <label>
                    {labels.organization}
                    <input name="organization_name" required minLength={2} />
                  </label>
                  <label>
                    {labels.email}
                    <input name="email" type="email" required />
                  </label>
                  <label>
                    {labels.password}
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={14}
                    />
                  </label>
                  <label>
                    {labels.plan}
                    <select name="requested_plan">
                      <option value="professional">
                        {labels.professional}
                      </option>
                      <option value="organization">
                        {labels.organisation}
                      </option>
                    </select>
                  </label>
                  <label className={styles.checkbox}>
                    <input name="terms" type="checkbox" required />
                    {labels.terms}
                  </label>
                  <button
                    className="button button--primary"
                    disabled={submitting}
                    type="submit"
                  >
                    {labels.create}
                  </button>
                </form>
              )}
            </section>
            <section aria-labelledby="professional-signin-heading">
              <h2 id="professional-signin-heading">{labels.signIn}</h2>
              <form onSubmit={signIn}>
                <label>
                  {labels.email}
                  <input name="email" type="email" required />
                </label>
                <label>
                  {labels.password}
                  <input name="password" type="password" required />
                </label>
                <button className="button" disabled={submitting} type="submit">
                  {labels.signInButton}
                </button>
              </form>
            </section>
          </div>
        )}
        {message && (
          <p className={styles.message} role="status">
            {message}
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
