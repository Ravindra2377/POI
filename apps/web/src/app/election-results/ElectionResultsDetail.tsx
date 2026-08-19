"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  localizedElectionResultText,
  type ElectionResultRecord,
} from "@/lib/election-results";
import { OfficialElectionResultClaim } from "./OfficialElectionResultClaim";
import styles from "./election-results.module.css";

const copy = {
  en: {
    back: "← All election results",
    eyebrow: "ANDHRA PRADESH · ELECTION RESULT RECORD",
    unavailable: "Election result record unavailable",
    unavailableText:
      "No reviewed, source-backed election result is published at this address. The address alone does not establish that a winner, constituency or party exists.",
    prepared: "Prepared-data status",
    overview: "Official overview",
    details: "Official result details",
    observation: "Observation",
    result: "Result",
    constituency: "Constituency",
    constituencyNo: "Constituency number",
    reservedCategory: "Reservation",
    district: "District",
    party: "Party",
    term: "Term",
    memberSlNo: "Member list number",
    electedVia: "Elected via",
    seatStatus: "Seat status",
    annotation: "Source annotation",
    viaGeneral: "General election",
    viaBye: "By-election",
    statusNone: "No change recorded",
    statusDied: "Died",
    statusResigned: "Resigned",
    statusDisqualified: "Disqualified",
    statusByeElection: "By-election",
  },
  te: {
    back: "← అన్ని ఎన్నికల ఫలితాలు",
    eyebrow: "ఆంధ్రప్రదేశ్ · ఎన్నికల ఫలితం రికార్డు",
    unavailable: "ఎన్నికల ఫలితం రికార్డు అందుబాటులో లేదు",
    unavailableText:
      "ఈ చిరునామాలో సమీక్షించిన, మూలాధారంతో కూడిన ఎన్నికల ఫలితం ప్రచురించబడలేదు. ఈ చిరునామా మాత్రమే విజేత, నియోజకవర్గం లేదా పార్టీ ఉందని నిర్ధారించదు.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    overview: "అధికారిక అవలోకనం",
    details: "అధికారిక ఫలిత వివరాలు",
    observation: "పరిశీలన",
    result: "ఫలితం",
    constituency: "నియోజకవర్గం",
    constituencyNo: "నియోజకవర్గ సంఖ్య",
    reservedCategory: "రిజర్వేషన్",
    district: "జిల్లా",
    party: "పార్టీ",
    term: "పదవీ కాలం",
    memberSlNo: "సభ్యుల జాబితా సంఖ్య",
    electedVia: "ఎన్నికైన విధానం",
    seatStatus: "సీటు స్థితి",
    annotation: "మూలం అనుబంధ గమనిక",
    viaGeneral: "సాధారణ ఎన్నిక",
    viaBye: "ఉప ఎన్నిక",
    statusNone: "మార్పు నమోదు కాలేదు",
    statusDied: "మరణం",
    statusResigned: "రాజీనామా",
    statusDisqualified: "అనర్హత",
    statusByeElection: "ఉప ఎన్నిక",
  },
} as const;

type Copy = { [Key in keyof (typeof copy)["en"]]: string };

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

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function ElectionResultsDetail({
  record,
  requestedSlug,
}: {
  record: ElectionResultRecord | null;
  requestedSlug: string;
}) {
  const { locale } = useLocale();
  const labels = getCopyLabels(copy, locale);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className={`page-intro shell ${styles.detailHeader}`}>
          <Link className={styles.backLink} href="/election-results">
            {labels.back}
          </Link>
          <p className="eyebrow">{labels.eyebrow}</p>
          {record ? (
            <OfficialElectionResultClaim
              label={labels.observation}
              source={record.member_name.source}
            >
              <h1 lang={locale}>
                {localizedElectionResultText(record.member_name.value, locale)}
              </h1>
            </OfficialElectionResultClaim>
          ) : (
            <>
              <h1>{labels.unavailable}</h1>
              <p className="lede">{labels.unavailableText}</p>
              <p className={styles.unavailableSlug}>
                {labels.prepared}: {requestedSlug}
              </p>
            </>
          )}
        </header>
        {record && (
          <section className="section shell">
            <div className={styles.detailGrid}>
              <div>
                <h2>{labels.overview}</h2>
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
                {record.annotation ? (
                  <OfficialElectionResultClaim
                    label={labels.annotation}
                    source={record.annotation.source}
                  >
                    <p lang={locale}>
                      {localizedElectionResultText(
                        record.annotation.value,
                        locale,
                      )}
                    </p>
                  </OfficialElectionResultClaim>
                ) : null}
              </div>
              <div>
                <h2>{labels.details}</h2>
                <div className={styles.detailClaims}>
                  <OfficialElectionResultClaim
                    label={labels.memberSlNo}
                    source={record.member_name.source}
                  >
                    {record.member_sl_no}
                  </OfficialElectionResultClaim>
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
                    label={labels.constituencyNo}
                    source={record.constituency.source}
                  >
                    {record.constituency_no || "—"}
                  </OfficialElectionResultClaim>
                  <OfficialElectionResultClaim
                    label={labels.reservedCategory}
                    source={record.constituency.source}
                  >
                    {record.reserved_category || "—"}
                  </OfficialElectionResultClaim>
                  <OfficialElectionResultClaim
                    label={labels.district}
                    source={record.district.source}
                  >
                    {localizedElectionResultText(record.district.value, locale)}
                  </OfficialElectionResultClaim>
                  {record.party ? (
                    <OfficialElectionResultClaim
                      label={labels.party}
                      source={record.party.source}
                    >
                      {localizedElectionResultText(record.party.value, locale)}
                    </OfficialElectionResultClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>{labels.party}</span>
                      <div className={styles.claimValue}>—</div>
                    </div>
                  )}
                  <OfficialElectionResultClaim
                    label={labels.term}
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
                    label={labels.seatStatus}
                    source={record.seat_status.source}
                  >
                    {seatStatusLabel(record.seat_status.value, labels)}
                  </OfficialElectionResultClaim>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <PageFooter />
    </>
  );
}
