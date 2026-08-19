"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  filterElectionResults,
  getElectionResults,
  localizedElectionResultText,
  type ElectionResultFilters,
  type ElectionResultRecord,
} from "@/lib/election-results";
import { OfficialElectionResultClaim } from "./OfficialElectionResultClaim";
import styles from "./election-results.module.css";

const copy = {
  en: {
    eyebrow: "ANDHRA PRADESH · PREPARED DIRECTORY",
    title: "AP Election Results",
    intro: "A source-first directory for reviewed constituency-level results.",
    prepared: "Prepared directory · No reviewed election results",
    preparedText:
      "The routes and filters are ready. No result is published until source and bilingual review is complete.",
    ruleResult: "A result is not a verdict.",
    ruleBye: "A bye-election is a new result.",
    chainEyebrow: "RESULTS AND SEAT STATUS",
    chainTitle: "Every result stays bounded by its source",
    chainNote:
      "A record asserts the winner, constituency and party named in its source. Nothing is extrapolated beyond them.",
    noteGeneral: "General election",
    noteGeneralText: "The member elected in that term's general election.",
    noteBye: "By-election",
    noteByeText: "The member elected after a later change to that seat.",
    noteStatus: "Seat status",
    noteStatusText:
      "A recorded death, resignation, disqualification or bye-election in the source.",
    filters: "Filter reviewed election results",
    district: "District",
    party: "Party",
    term: "Term",
    seatStatus: "Seat status",
    allDistricts: "All districts",
    allParties: "All parties",
    allTerms: "All terms",
    allStatuses: "All statuses",
    loading: "Loading the reviewed election results catalogue…",
    emptyTitle: "No reviewed election results are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh has no election results.",
    noMatchTitle: "No reviewed election results match these filters",
    noMatchText: "Change one or more filters to see other reviewed results.",
    errorTitle: "Election results could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No result is being substituted.",
    retry: "Retry",
    observation: "Observation",
    result: "Result",
    constituency: "Constituency",
    districtLabel: "District",
    partyLabel: "Party",
    termLabel: "Term",
    electedVia: "Elected via",
    seatStatusLabel: "Seat status",
    viaGeneral: "General election",
    viaBye: "By-election",
    statusNone: "No change recorded",
    statusDied: "Died",
    statusResigned: "Resigned",
    statusDisqualified: "Disqualified",
    statusByeElection: "By-election",
    partyUnstated: "Party not stated in source",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · సిద్ధం చేసిన డైరెక్టరీ",
    title: "ఆంధ్రప్రదేశ్ ఎన్నికల ఫలితాలు",
    intro:
      "సమీక్షించిన నియోజకవర్గ స్థాయి ఫలితాల కోసం మూలాధార-కేంద్రీకృత డైరెక్టరీ.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన ఎన్నికల ఫలితాలు లేవు",
    preparedText:
      "మార్గాలు, ఫిల్టర్లు సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు ఏ ఫలితం ప్రచురించబడదు.",
    ruleResult: "ఫలితం తీర్పు కాదు.",
    ruleBye: "ఉప ఎన్నిక కొత్త ఫలితం.",
    chainEyebrow: "ఫలితాలు మరియు సీటు స్థితి",
    chainTitle: "ప్రతి ఫలితం దాని మూలంతో పరిమితం",
    chainNote:
      "ఒక రికార్డు దాని మూలంలో పేర్కొన్న విజేత, నియోజకవర్గం మరియు పార్టీని నిర్ధారిస్తుంది. వాటికి మించి ఏదీ ఊహించబడదు.",
    noteGeneral: "సాధారణ ఎన్నిక",
    noteGeneralText: "ఆ పదవీ కాలంలోని సాధారణ ఎన్నికల్లో ఎన్నికైన సభ్యుడు.",
    noteBye: "ఉప ఎన్నిక",
    noteByeText: "ఆ సీటులో తర్వాతి మార్పు తర్వాత ఎన్నికైన సభ్యుడు.",
    noteStatus: "సీటు స్థితి",
    noteStatusText: "మూలంలో నమోదైన మరణం, రాజీనామా, అనర్హత లేదా ఉప ఎన్నిక.",
    filters: "సమీక్షించిన ఎన్నికల ఫలితాలను ఫిల్టర్ చేయండి",
    district: "జిల్లా",
    party: "పార్టీ",
    term: "పదవీ కాలం",
    seatStatus: "సీటు స్థితి",
    allDistricts: "అన్ని జిల్లాలు",
    allParties: "అన్ని పార్టీలు",
    allTerms: "అన్ని పదవీ కాలాలు",
    allStatuses: "అన్ని స్థితులు",
    loading: "సమీక్షించిన ఎన్నికల ఫలితాల జాబితా లోడ్ అవుతోంది…",
    emptyTitle: "సమీక్షించిన ఎన్నికల ఫలితాలు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో ఎన్నికలు జరగలేదని చెప్పడం కాదు.",
    noMatchTitle: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన ఎన్నికల ఫలితాలు లేవు",
    noMatchText: "ఇతర సమీక్షించిన ఫలితాల కోసం ఫిల్టర్లను మార్చండి.",
    errorTitle: "ఎన్నికల ఫలితాలను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ ఫలితం చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    observation: "పరిశీలన",
    result: "ఫలితం",
    constituency: "నియోజకవర్గం",
    districtLabel: "జిల్లా",
    partyLabel: "పార్టీ",
    termLabel: "పదవీ కాలం",
    electedVia: "ఎన్నికైన విధానం",
    seatStatusLabel: "సీటు స్థితి",
    viaGeneral: "సాధారణ ఎన్నిక",
    viaBye: "ఉప ఎన్నిక",
    statusNone: "మార్పు నమోదు కాలేదు",
    statusDied: "మరణం",
    statusResigned: "రాజీనామా",
    statusDisqualified: "అనర్హత",
    statusByeElection: "ఉప ఎన్నిక",
    partyUnstated: "మూలంలో పార్టీ పేర్కొనబడలేదు",
  },
} as const;

type Copy = { [Key in keyof (typeof copy)["en"]]: string };

const initialFilters: ElectionResultFilters = {
  district: "",
  party: "",
  term: "",
  seatStatus: "",
};

function electedViaLabel(value: string, labels: Copy): string {
  if (value === "general_election") return labels.viaGeneral;
  if (value === "bye_election") return labels.viaBye;
  return value;
}

function seatStatusLabel(value: string, labels: Copy): string {
  if (value === "died") return labels.statusDied;
  if (value === "resigned") return labels.statusResigned;
  if (value === "disqualified") return labels.statusDisqualified;
  if (value === "bye_election") return labels.statusByeElection;
  return labels.statusNone;
}

function uniqueValues(
  records: ElectionResultRecord[],
  select: (record: ElectionResultRecord) => string,
): string[] {
  return [...new Set(records.map(select).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function termOptions(records: ElectionResultRecord[]): {
  value: string;
  label: string;
}[] {
  const terms = new Map<number, string>();
  records.forEach((record) =>
    terms.set(record.term_id, record.term_period.value.en),
  );
  return [...terms.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([value, label]) => ({ value: String(value), label }));
}

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function ElectionResultsDirectory() {
  const { locale } = useLocale();
  const labels = getCopyLabels(copy, locale);
  const [records, setRecords] = useState<ElectionResultRecord[]>([]);
  const [filters, setFilters] = useState<ElectionResultFilters>(initialFilters);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
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
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const districts = uniqueValues(records, (record) => record.district.value.en);
  const parties = uniqueValues(
    records,
    (record) => record.party?.value.en ?? "",
  );
  const terms = termOptions(records);
  const statuses = uniqueValues(records, (record) => record.seat_status.value);
  const filtered = filterElectionResults(records, filters);

  function selectFilter<Key extends keyof ElectionResultFilters>(
    key: Key,
    value: ElectionResultFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
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
        </header>

        <section className="money-rules">
          <div className="shell money-rules__grid">
            <strong>{labels.ruleResult}</strong>
            <strong>{labels.ruleBye}</strong>
          </div>
        </section>

        <section
          className="section shell"
          aria-labelledby="election-results-rules-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.chainEyebrow}</p>
              <h2 id="election-results-rules-heading">{labels.chainTitle}</h2>
            </div>
            <p>{labels.chainNote}</p>
          </div>
          <ul className={styles.termNotes}>
            <li>
              <strong>{labels.noteGeneral}</strong>
              <span>{labels.noteGeneralText}</span>
            </li>
            <li>
              <strong>{labels.noteBye}</strong>
              <span>{labels.noteByeText}</span>
            </li>
            <li>
              <strong>{labels.noteStatus}</strong>
              <span>{labels.noteStatusText}</span>
            </li>
          </ul>
        </section>

        <section className="section shell" aria-labelledby="election-results">
          <h2 className="sr-only" id="election-results">
            {labels.title}
          </h2>
          <fieldset className={styles.filters}>
            <legend className="sr-only">{labels.filters}</legend>
            <OptionFilter
              id="election-results-district"
              label={labels.district}
              allLabel={labels.allDistricts}
              options={districts.map((value) => ({ value, label: value }))}
              value={filters.district}
              onChange={(value) => selectFilter("district", value)}
            />
            <OptionFilter
              id="election-results-party"
              label={labels.party}
              allLabel={labels.allParties}
              options={parties.map((value) => ({ value, label: value }))}
              value={filters.party}
              onChange={(value) => selectFilter("party", value)}
            />
            <OptionFilter
              id="election-results-term"
              label={labels.term}
              allLabel={labels.allTerms}
              options={terms}
              value={filters.term}
              onChange={(value) => selectFilter("term", value)}
            />
            <OptionFilter
              id="election-results-seat-status"
              label={labels.seatStatus}
              allLabel={labels.allStatuses}
              options={statuses.map((value) => ({
                value,
                label: seatStatusLabel(value, labels),
              }))}
              value={filters.seatStatus}
              onChange={(value) => selectFilter("seatStatus", value)}
            />
          </fieldset>

          <div className={styles.results} aria-live="polite">
            {state === "loading" && (
              <div className="page-state" role="status">
                {labels.loading}
              </div>
            )}
            {state === "error" && (
              <div className="error-state" role="alert">
                <h3>{labels.errorTitle}</h3>
                <p>{labels.errorText}</p>
                <button
                  className="button button--secondary"
                  onClick={() => void load()}
                  type="button"
                >
                  {labels.retry}
                </button>
              </div>
            )}
            {state === "ready" && records.length === 0 && (
              <div className="empty-state">
                <h3>{labels.emptyTitle}</h3>
                <p>{labels.emptyText}</p>
              </div>
            )}
            {state === "ready" &&
              records.length > 0 &&
              filtered.length === 0 && (
                <div className="empty-state">
                  <h3>{labels.noMatchTitle}</h3>
                  <p>{labels.noMatchText}</p>
                </div>
              )}
            {state === "ready" && filtered.length > 0 && (
              <ul className={styles.records}>
                {filtered.map((record) => (
                  <li key={record.slug}>
                    <div>
                      <OfficialElectionResultClaim
                        label={labels.observation}
                        source={record.member_name.source}
                      >
                        <h2 lang={locale}>
                          <Link href={`/election-results/${record.slug}`}>
                            {localizedElectionResultText(
                              record.member_name.value,
                              locale,
                            )}
                          </Link>
                        </h2>
                      </OfficialElectionResultClaim>
                      <OfficialElectionResultClaim
                        label={labels.result}
                        source={record.constituency.source}
                      >
                        <p lang={locale}>
                          {localizedElectionResultText(
                            record.constituency.value,
                            locale,
                          )}
                          {record.constituency_no
                            ? ` · ${record.constituency_no}`
                            : ""}
                          {record.reserved_category
                            ? ` · ${record.reserved_category}`
                            : ""}
                        </p>
                      </OfficialElectionResultClaim>
                    </div>
                    <div className={styles.claimGrid}>
                      <OfficialElectionResultClaim
                        label={labels.constituency}
                        source={record.constituency.source}
                      >
                        {localizedElectionResultText(
                          record.constituency.value,
                          locale,
                        )}
                      </OfficialElectionResultClaim>
                      <OfficialElectionResultClaim
                        label={labels.districtLabel}
                        source={record.district.source}
                      >
                        {localizedElectionResultText(
                          record.district.value,
                          locale,
                        )}
                      </OfficialElectionResultClaim>
                      {record.party ? (
                        <OfficialElectionResultClaim
                          label={labels.partyLabel}
                          source={record.party.source}
                        >
                          {localizedElectionResultText(
                            record.party.value,
                            locale,
                          )}
                        </OfficialElectionResultClaim>
                      ) : (
                        <div className={styles.claim}>
                          <span className={styles.claimLabel}>
                            {labels.partyLabel}
                          </span>
                          <div className={styles.claimValue}>
                            {labels.partyUnstated}
                          </div>
                        </div>
                      )}{" "}
                      <OfficialElectionResultClaim
                        label={labels.termLabel}
                        source={record.term_period.source}
                      >
                        {localizedElectionResultText(
                          record.term_period.value,
                          locale,
                        )}
                      </OfficialElectionResultClaim>
                      <OfficialElectionResultClaim
                        label={labels.electedVia}
                        source={record.elected_via.source}
                      >
                        {electedViaLabel(record.elected_via.value, labels)}
                      </OfficialElectionResultClaim>
                      <OfficialElectionResultClaim
                        label={labels.seatStatusLabel}
                        source={record.seat_status.source}
                      >
                        {seatStatusLabel(record.seat_status.value, labels)}
                      </OfficialElectionResultClaim>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}

function OptionFilter({
  id,
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
