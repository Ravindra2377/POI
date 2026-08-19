"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/RecordStatus";
import { useLocale } from "@/components/LocaleProvider";
import { getCopyLabels } from "@/lib/copy-helper";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getElectionResults } from "@/lib/election-results";
import {
  latestTermId,
  localizedConstituencyText,
  resultDistricts,
  seatsForDistrict,
  seatBySlug,
} from "@/lib/know-your-constituency";
import type { ElectionResultRecord } from "@/lib/election-results";
import { ConstituencyProfileCard } from "./ConstituencyProfileCard";
import styles from "./know-your-constituency.module.css";

const copy = {
  en: {
    eyebrow: "ANDHRA PRADESH · KNOW YOUR CONSTITUENCY",
    title: "Know Your Constituency",
    intro:
      "A constituency-first look at reviewed, source-linked Assembly records. Choose your district, then your seat.",
    prepared: "Prepared-data status",
    preparedText:
      "The routes and flow are ready. No constituency record is published until source and bilingual review is complete.",
    privacy: "Coarse geography only",
    privacyText:
      "This page uses only the district and constituency you choose. No precise location, coordinates or device location is collected, and your choice is kept only in the web address.",
    ruleBound: "A record asserts what its source names.",
    ruleBye: "A bye-election is a new result.",
    chooseHeading: "Choose your district",
    chooseNote:
      "Search reviewed constituencies by English or Telugu, then pick your district.",
    searchLabel: "Search constituencies",
    searchPlaceholder: "Srikakulam, శ్రీకాకుళం…",
    districtLabel: "Your district",
    districtPlaceholder: "Select a district",
    loading: "Loading the reviewed constituency catalogue…",
    noResultsTitle: "No reviewed constituency records are published yet",
    noResultsText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh has no elected members.",
    errorTitle: "Constituency records could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No record is being substituted.",
    retry: "Retry",
    seatsHeading: "Seats in {district}",
    seatsNote:
      "The current Assembly ({term}). Each seat is a reviewed official record.",
    seatsEmpty: "No reviewed seats are published for this district yet.",
    prompt: "Choose a district above to see its reviewed seats.",
    seatLink: "View the record for {constituency}",
    cardHeading: "Your constituency record",
    cardNote: "Every claim is official and linked to its source record.",
    openDirectory: "Open the election-results directory",
    openDirectoryNote:
      "Browse all reviewed constituency results across every term.",
    shareHeading: "Share this record",
    shareNote:
      "The share card carries the same official, source-linked claims.",
    communityHeading: "Your constituency, by you",
    communityText:
      "Structured submissions, comments and polls for your seat are planned, not open. Nothing can be submitted or collected yet — no account, no consent flow, no comment box.",
    communityLink: "Read the community charter",
    communityLinkNote:
      "Participation modes, consent and moderation controls are previewed there.",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · మీ నియోజకవర్గాన్ని తెలుసుకోండి",
    title: "మీ నియోజకవర్గాన్ని తెలుసుకోండి",
    intro:
      "సమీక్షించిన, మూలాధారంతో కూడిన అసెంబ్లీ రికార్డులపై నియోజకవర్గ-కేంద్రీకృత దృశ్యం. మీ జిల్లాను, ఆపై సీటును ఎంచుకోండి.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    preparedText:
      "మార్గాలు, ప్రవాహం సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు నియోజకవర్గ రికార్డు ప్రచురించబడదు.",
    privacy: "స్థూల ప్రాంతం మాత్రమే",
    privacyText:
      "ఈ పేజీ మీరు ఎంచుకున్న జిల్లా మరియు నియోజకవర్గాన్ని మాత్రమే ఉపయోగిస్తుంది. ఖచ్చితమైన స్థానం, కోఆర్డినేట్లు లేదా పరికర స్థానం సేకరించబడదు; మీ ఎంపిక వెబ్ చిరునామాలో మాత్రమే ఉంటుంది.",
    ruleBound: "ఒక రికార్డు తన మూలం పేర్కొన్న దానినే నిర్ధారిస్తుంది.",
    ruleBye: "ఉప ఎన్నిక కొత్త ఫలితం.",
    chooseHeading: "మీ జిల్లాను ఎంచుకోండి",
    chooseNote:
      "ఇంగ్లీష్ లేదా తెలుగులో నియోజకవర్గాలను వెతకండి, ఆపై మీ జిల్లాను ఎంచుకోండి.",
    searchLabel: "నియోజకవర్గాలను వెతకండి",
    searchPlaceholder: "శ్రీకాకుళం, Srikakulam…",
    districtLabel: "మీ జిల్లా",
    districtPlaceholder: "జిల్లాను ఎంచుకోండి",
    loading: "సమీక్షించిన నియోజకవర్గ జాబితా లోడ్ అవుతోంది…",
    noResultsTitle: "సమీక్షించిన నియోజకవర్గ రికార్డులు ఇంకా ప్రచురించబడలేదు",
    noResultsText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో ఎన్నికైన సభ్యులు లేరని చెప్పడం కాదు.",
    errorTitle: "నియోజకవర్గ రికార్డులను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ రికార్డు చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    seatsHeading: "{district}లో సీట్లు",
    seatsNote:
      "ప్రస్తుత అసెంబ్లీ ({term}). ప్రతి సీటు సమీక్షించిన అధికారిక రికార్డు.",
    seatsEmpty: "ఈ జిల్లాకు సమీక్షించిన సీట్లు ఇంకా ప్రచురించబడలేదు.",
    prompt: "సమీక్షించిన సీట్ల కోసం పైన జిల్లాను ఎంచుకోండి.",
    seatLink: "{constituency} కోసం రికార్డును చూడండి",
    cardHeading: "మీ నియోజకవర్గ రికార్డు",
    cardNote:
      "ప్రతి వాదన అధికారికమైనది మరియు దాని మూల రికార్డుకు అనుసంధానించబడింది.",
    openDirectory: "ఎన్నికల ఫలితాల డైరెక్టరీని తెరవండి",
    openDirectoryNote:
      "ప్రతి పదవీ కాలంలోని అన్ని సమీక్షించిన నియోజకవర్గ ఫలితాలను చూడండి.",
    shareHeading: "ఈ రికార్డును భాగస్వామ్యం చేయండి",
    shareNote: "షేర్ కార్డు అదే అధికారిక, మూలాధార వాదనలను కలిగి ఉంటుంది.",
    communityHeading: "మీ నియోజకవర్గం, మీ చేత",
    communityText:
      "మీ సీటుకు నిర్మాణాత్మక సమర్పణలు, వ్యాఖ్యలు మరియు పోల్స్ ప్రణాళికలో ఉన్నాయి, ప్రారంభంలో కాదు. ఇంకా ఏదీ సమర్పించలేరు లేదా సేకరించలేరు — ఖాతా, సమ్మతి ప్రవాహం, వ్యాఖ్య పెట్టె ఏవీ లేవు.",
    communityLink: "కమ్యూనిటీ చార్టర్ చదవండి",
    communityLinkNote:
      "పాల్గొనే విధానాలు, సమ్మతి మరియు మోడరేషన్ నియంత్రణలు అక్కడ ముందే చూడవచ్చు.",
  },
} as const;

function fillTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

export function KnowYourConstituency() {
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const labels = getCopyLabels(copy, locale);

  const [records, setRecords] = useState<ElectionResultRecord[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const districtValue = searchParams.get("district") ?? "";
  const seatSlug = searchParams.get("seat") ?? "";

  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const response = await getElectionResults(signal);
      setRecords(response.data);
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRecords([]);
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

  const termId = latestTermId(records);
  const districts = useMemo(
    () => resultDistricts(records, termId),
    [records, termId],
  );
  const selectedDistrict =
    districts.find((district) => district.en === districtValue) ?? null;
  const seats = useMemo(
    () =>
      selectedDistrict
        ? seatsForDistrict(records, termId, selectedDistrict.en)
        : [],
    [records, termId, selectedDistrict],
  );
  const selectedSeat =
    seatSlug && selectedDistrict
      ? (seatBySlug(records, seatSlug) ?? null)
      : null;

  const visibleDistricts = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return districts;
    return districts.filter((district) =>
      [district.en, district.te].some((value) =>
        value.toLocaleLowerCase().includes(needle),
      ),
    );
  }, [districts, query]);

  const termPeriod = selectedSeat
    ? localizedConstituencyText(selectedSeat.term_period.value, locale)
    : "";

  function selectDistrict(en: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (en) {
      params.set("district", en);
      params.delete("seat");
    } else {
      params.delete("district");
      params.delete("seat");
    }
    router.replace(`/know-your-constituency?${params.toString()}`);
  }

  function selectSeat(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedDistrict) params.set("district", selectedDistrict.en);
    if (slug) {
      params.set("seat", slug);
    } else {
      params.delete("seat");
    }
    router.replace(`/know-your-constituency?${params.toString()}`);
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
          <aside className={styles.notice} aria-label={labels.prepared}>
            <strong>{labels.prepared}</strong>
            <p>{labels.preparedText}</p>
          </aside>
          <aside className={styles.notice} aria-label={labels.privacy}>
            <strong>{labels.privacy}</strong>
            <p>{labels.privacyText}</p>
          </aside>
        </header>

        <section className="money-rules">
          <div className="shell money-rules__grid">
            <strong>{labels.ruleBound}</strong>
            <strong>{labels.ruleBye}</strong>
          </div>
        </section>

        <section
          className="section shell"
          aria-labelledby="choose-district-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">SEARCH</p>
              <h2 id="choose-district-heading">{labels.chooseHeading}</h2>
            </div>
            <p>{labels.chooseNote}</p>
          </div>
          <div className={styles.toolbar}>
            <div className={styles.areaSearch}>
              <label htmlFor="know-your-constituency-search">
                {labels.searchLabel}
              </label>
              <input
                id="know-your-constituency-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
                autoComplete="off"
              />
            </div>
            <div className={styles.areaSelect}>
              <label htmlFor="know-your-constituency-district">
                {labels.districtLabel}
              </label>
              <select
                id="know-your-constituency-district"
                value={districtValue}
                onChange={(event) => selectDistrict(event.currentTarget.value)}
              >
                <option value="">{labels.districtPlaceholder}</option>
                {visibleDistricts.map((district) => (
                  <option key={district.en} value={district.en}>
                    {locale === "te" ? district.te : district.en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="section shell" aria-labelledby="seats-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">SEATS</p>
              <h2 id="seats-heading">
                {selectedDistrict
                  ? fillTemplate(labels.seatsHeading, {
                      district:
                        locale === "te"
                          ? selectedDistrict.te
                          : selectedDistrict.en,
                    })
                  : labels.seatsHeading}
              </h2>
            </div>
            <p>
              {termPeriod
                ? fillTemplate(labels.seatsNote, { term: termPeriod })
                : labels.seatsNote}
            </p>
          </div>

          <div className={styles.results} aria-live="polite">
            {state === "loading" && (
              <div className="page-state" role="status">
                {labels.loading}
              </div>
            )}
            {state === "error" && (
              <ErrorState
                message={labels.errorText}
                onRetry={() => void load()}
              />
            )}
            {state === "ready" && records.length === 0 && (
              <div className="empty-state">
                <h3>{labels.noResultsTitle}</h3>
                <p>{labels.noResultsText}</p>
              </div>
            )}
            {state === "ready" && !selectedDistrict && records.length > 0 && (
              <div className="empty-state">
                <h3>{labels.prompt}</h3>
              </div>
            )}
            {state === "ready" && selectedDistrict && seats.length === 0 && (
              <div className="empty-state">
                <h3>{labels.seatsEmpty}</h3>
              </div>
            )}
            {state === "ready" && seats.length > 0 && (
              <ul className={styles.seats}>
                {seats.map((seat) => (
                  <li key={seat.slug}>
                    <button
                      className={styles.seatRow}
                      type="button"
                      onClick={() => selectSeat(seat.slug)}
                      aria-pressed={seat.slug === seatSlug}
                      aria-label={fillTemplate(labels.seatLink, {
                        constituency: localizedConstituencyText(
                          seat.constituency.value,
                          locale,
                        ),
                      })}
                    >
                      <span className={styles.seatConstituency}>
                        {localizedConstituencyText(
                          seat.constituency.value,
                          locale,
                        )}
                        {seat.constituency_no
                          ? ` · ${seat.constituency_no}`
                          : ""}
                        {seat.reserved_category
                          ? ` · ${seat.reserved_category}`
                          : ""}
                      </span>
                      <span className={styles.seatMember}>
                        {localizedConstituencyText(
                          seat.member_name.value,
                          locale,
                        )}
                      </span>
                      <span className={styles.seatParty}>
                        {seat.party
                          ? localizedConstituencyText(seat.party.value, locale)
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {selectedSeat && (
          <section
            className="section section--tinted"
            aria-labelledby="profile-heading"
          >
            <div className="shell">
              <div className="section-heading section-heading--split">
                <div>
                  <p className="eyebrow">PROFILE</p>
                  <h2 id="profile-heading">{labels.cardHeading}</h2>
                </div>
                <p>{labels.cardNote}</p>
              </div>
              <ConstituencyProfileCard record={selectedSeat} />
            </div>
          </section>
        )}

        <section
          className="section shell"
          aria-labelledby="directory-link-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">BROWSE</p>
              <h2 id="directory-link-heading">{labels.openDirectory}</h2>
            </div>
            <p>{labels.openDirectoryNote}</p>
          </div>
          <Link className="button button--secondary" href="/election-results">
            {labels.openDirectory}
          </Link>
        </section>

        <section className="section shell" aria-labelledby="community-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">COMMUNITY · SUBMIT</p>
              <h2 id="community-heading">{labels.communityHeading}</h2>
            </div>
            <p>{labels.communityText}</p>
          </div>
          <Link className="button button--secondary" href="/community">
            {labels.communityLink}
          </Link>
          <p className={styles.communityNote}>{labels.communityLinkNote}</p>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
