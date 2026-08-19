"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/RecordStatus";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getDistricts } from "@/lib/catalog-api";
import type { GeographyRecord } from "@/lib/catalog-types";
import { areaDomains, districtName, localizedAreaText } from "@/lib/my-area";
import styles from "./my-area.module.css";

const copy = {
  en: {
    eyebrow: "ANDHRA PRADESH · MY AREA",
    title: "My Area",
    intro:
      "A coarse, source-first briefing for your area. Choose a district; no precise location is used.",
    privacy: "Coarse geography only",
    privacyText:
      "This page uses only the district you select. No precise location, coordinates or device location is collected, and your choice is kept only in the web address.",
    chooseHeading: "Choose your area",
    chooseNote:
      "Search reviewed districts by English, Telugu or alternate name, then pick your area.",
    searchLabel: "Search districts",
    searchPlaceholder: "Visakhapatnam, విశాఖపట్నం or Vizag",
    searchButton: "Search",
    areaLabel: "Your district",
    areaPlaceholder: "Select a district",
    districtsLoading: "Loading reviewed districts…",
    districtsEmpty: "No reviewed districts are available yet.",
    districtsError: "The official-record API could not be reached.",
    briefingEyebrow: "AREA BRIEFING",
    briefingBase: "Area briefing",
    briefingTitle: "Prepared briefing for {district}",
    briefingNote:
      "Each panel shows what would appear here once reviewed records are published for this district. Nothing is demonstrated.",
    prompt: "Choose a district above to see its prepared briefing.",
    openDirectory: "Open the {domain} directory",
    noRecordsLabel: "No reviewed records published for {district} yet",
    alertsEyebrow: "ALERTS",
    alertsTitle: "Alerts are planned, not available",
    alertsText:
      "Area alerts require a reviewable account and consent controls, which are not built. No email, phone or push subscription is collected today. When alerts are built they will only cover published, reviewed records.",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · నా ప్రాంతం",
    title: "నా ప్రాంతం",
    intro:
      "మీ ప్రాంతానికి స్థూల, మూలాధార-కేంద్రీకృత సారాంశం. జిల్లాను ఎంచుకోండి; ఖచ్చితమైన స్థానం ఉపయోగించబడదు.",
    privacy: "స్థూల ప్రాంతం మాత్రమే",
    privacyText:
      "ఈ పేజీ మీరు ఎంచుకున్న జిల్లాను మాత్రమే ఉపయోగిస్తుంది. ఖచ్చితమైన స్థానం, కోఆర్డినేట్లు లేదా పరికర స్థానం సేకరించబడదు; మీ ఎంపిక వెబ్ చిరునామాలో మాత్రమే ఉంటుంది.",
    chooseHeading: "మీ ప్రాంతాన్ని ఎంచుకోండి",
    chooseNote:
      "ఇంగ్లీష్, తెలుగు లేదా ప్రత్యామ్నాయ పేరుతో సమీక్షించిన జిల్లాలను వెతకండి, ఆపై మీ ప్రాంతాన్ని ఎంచుకోండి.",
    searchLabel: "జిల్లాలను వెతకండి",
    searchPlaceholder: "విశాఖపట్నం, విశాఖపట్నం లేదా Vizag",
    searchButton: "వెతకండి",
    areaLabel: "మీ జిల్లా",
    areaPlaceholder: "జిల్లాను ఎంచుకోండి",
    districtsLoading: "సమీక్షించిన జిల్లాలు లోడ్ అవుతున్నాయి…",
    districtsEmpty: "సమీక్షించిన జిల్లాలు ఇంకా అందుబాటులో లేవు.",
    districtsError: "అధికారిక రికార్డు API అందుబాటులో లేదు.",
    briefingEyebrow: "ప్రాంత సారాంశం",
    briefingBase: "ప్రాంత సారాంశం",
    briefingTitle: "{district} కోసం సిద్ధం చేసిన సారాంశం",
    briefingNote:
      "ఈ జిల్లాకు సమీక్షించిన రికార్డులు ప్రచురించబడిన తర్వాత ఇక్కడ ఏమి కనిపిస్తుందో ప్రతి ప్యానెల్ చూపుతుంది. ఏదీ ప్రదర్శించబడదు.",
    prompt: "దాని సిద్ధం చేసిన సారాంశం కోసం పైన జిల్లాను ఎంచుకోండి.",
    openDirectory: "{domain} డైరెక్టరీని తెరవండి",
    noRecordsLabel:
      "{district} కోసం సమీక్షించిన రికార్డులు ఇంకా ప్రచురించబడలేదు",
    alertsEyebrow: "హెచ్చరికలు",
    alertsTitle: "హెచ్చరికలు ప్రణాళికలో ఉన్నాయి, అందుబాటులో లేవు",
    alertsText:
      "ప్రాంత హెచ్చరికలకు సమీక్షించదగిన ఖాతా మరియు సమ్మతి నియంత్రణలు అవసరం, అవి నిర్మించబడలేదు. ఈరోజు ఇమెయిల్, ఫోన్ లేదా పుష్ సభ్యత్వం సేకరించబడదు. హెచ్చరికలు నిర్మించబడినప్పుడు అవి ప్రచురించిన, సమీక్షించిన రికార్డులను మాత్రమే కవర్ చేస్తాయి.",
  },
} as const;

function briefingTitle(template: string, district: string): string {
  return template.replace("{district}", district);
}

function linkTitle(template: string, domain: string): string {
  return template.replace("{domain}", domain);
}

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function MyArea() {
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const labels = getCopyLabels(copy, locale);

  const [districts, setDistricts] = useState<GeographyRecord[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const districtSlug = searchParams.get("district") ?? "";

  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const response = await getDistricts("", signal);
      setDistricts(response.data);
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setDistricts([]);
      setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const selectedDistrict = useMemo(
    () => districts.find((district) => district.slug === districtSlug) ?? null,
    [districts, districtSlug],
  );

  const visibleDistricts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return districts;
    return districts.filter((district) =>
      [
        district.name_en,
        district.name_te ?? "",
        ...district.aliases.map((alias) => alias.value),
      ].some((value) => value.toLocaleLowerCase().includes(needle)),
    );
  }, [districts, query]);

  function selectDistrict(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("district", slug);
    } else {
      params.delete("district");
    }
    router.replace(`/my-area?${params.toString()}`);
  }

  const districtLabel = selectedDistrict
    ? districtName(selectedDistrict, locale)
    : "";

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

        <section
          className="section shell"
          aria-labelledby="choose-area-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">SEARCH</p>
              <h2 id="choose-area-heading">{labels.chooseHeading}</h2>
            </div>
            <p>{labels.chooseNote}</p>
          </div>
          <div className={styles.toolbar}>
            <div className={styles.areaSearch}>
              <label htmlFor="my-area-search">{labels.searchLabel}</label>
              <input
                id="my-area-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                autoComplete="off"
              />
            </div>
            <div className={styles.areaSelect}>
              <label htmlFor="my-area-district">{labels.areaLabel}</label>
              <select
                id="my-area-district"
                value={districtSlug}
                onChange={(event) => selectDistrict(event.currentTarget.value)}
              >
                <option value="">{labels.areaPlaceholder}</option>
                {visibleDistricts.map((district) => (
                  <option key={district.id} value={district.slug}>
                    {districtName(district, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={styles.results} aria-live="polite">
            {state === "loading" && (
              <div className="page-state" role="status">
                {labels.districtsLoading}
              </div>
            )}
            {state === "error" && (
              <ErrorState
                message={labels.districtsError}
                onRetry={() => void load()}
              />
            )}
            {state === "ready" && districts.length === 0 && (
              <div className="empty-state">
                <h3>{labels.districtsEmpty}</h3>
              </div>
            )}
          </div>
        </section>

        <section
          className="section shell"
          aria-labelledby="area-briefing-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.briefingEyebrow}</p>
              <h2 id="area-briefing-heading">
                {districtLabel
                  ? briefingTitle(labels.briefingTitle, districtLabel)
                  : labels.briefingBase}
              </h2>
            </div>
            <p>{labels.briefingNote}</p>
          </div>
          {selectedDistrict ? (
            <ul className={styles.briefing}>
              {areaDomains.map((domain) => (
                <li key={domain.key} className={styles.panel}>
                  <div>
                    <span className="status-label" data-state="pending">
                      {briefingTitle(
                        labels.noRecordsLabel,
                        districtName(selectedDistrict, locale),
                      )}
                    </span>
                    <h3 lang={locale}>
                      {localizedAreaText(domain.name, locale)}
                    </h3>
                    <p>{localizedAreaText(domain.description, locale)}</p>
                  </div>
                  <Link href={domain.directoryHref}>
                    {linkTitle(
                      labels.openDirectory,
                      localizedAreaText(domain.name, locale),
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <h3>{labels.prompt}</h3>
            </div>
          )}
        </section>

        <section
          className="section section--tinted"
          aria-labelledby="alerts-heading"
        >
          <div className="shell">
            <div className={styles.alerts}>
              <p className="eyebrow">{labels.alertsEyebrow}</p>
              <h2 id="alerts-heading">{labels.alertsTitle}</h2>
              <p>{labels.alertsText}</p>
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
