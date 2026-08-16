"use client";

import { useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  localizedConstituencyText,
  seatStatusWord,
  buildShareText,
  buildWhatsAppShareUrl,
  constituencyPageUrl,
} from "@/lib/know-your-constituency";
import type { ElectionResultRecord } from "@/lib/election-results";
import { OfficialElectionResultClaim } from "../election-results/OfficialElectionResultClaim";
import styles from "./know-your-constituency.module.css";

const copy = {
  en: {
    memberSlNo: "Member list number",
    constituencyNo: "Constituency number",
    reservedCategory: "Reservation",
    district: "District",
    term: "Term",
    party: "Party",
    partyUnstated: "Party not stated in source",
    electedVia: "Elected via",
    viaGeneral: "General election",
    viaBye: "By-election",
    seatStatus: "Seat status",
    annotation: "Source annotation",
    shareHeading: "Share this record",
    whatsapp: "Share on WhatsApp",
    copyLink: "Copy link",
    copied: "Link copied",
    observation: "Observation",
    result: "Result",
  },
  te: {
    memberSlNo: "సభ్యుల జాబితా సంఖ్య",
    constituencyNo: "నియోజకవర్గ సంఖ్య",
    reservedCategory: "రిజర్వేషన్",
    district: "జిల్లా",
    term: "పదవీ కాలం",
    party: "పార్టీ",
    partyUnstated: "మూలంలో పార్టీ పేర్కొనబడలేదు",
    electedVia: "ఎన్నికైన విధానం",
    viaGeneral: "సాధారణ ఎన్నిక",
    viaBye: "ఉప ఎన్నిక",
    seatStatus: "సీటు స్థితి",
    annotation: "మూల వ్యాఖ్య",
    shareHeading: "ఈ రికార్డును భాగస్వామ్యం చేయండి",
    whatsapp: "వాట్సాప్‌లో భాగస్వామ్యం చేయండి",
    copyLink: "లింక్ కాపీ చేయండి",
    copied: "లింక్ కాపీ చేయబడింది",
    observation: "పరిశీలన",
    result: "ఫలితం",
  },
} as const;

function electedViaLabel(value: string, locale: "en" | "te"): string {
  if (value === "bye_election") {
    return locale === "te" ? copy.te.viaBye : copy.en.viaBye;
  }
  return locale === "te" ? copy.te.viaGeneral : copy.en.viaGeneral;
}

export function ConstituencyProfileCard({
  record,
}: {
  record: ElectionResultRecord;
}) {
  const { locale } = useLocale();
  const labels = copy[locale];
  const [copied, setCopied] = useState(false);

  const pageUrl = constituencyPageUrl(
    window.location.origin,
    record.district.value.en,
    record.slug,
  );
  const shareText = buildShareText(record, locale, pageUrl);
  const whatsappUrl = buildWhatsAppShareUrl(shareText);

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
  }

  return (
    <article className={styles.profile} lang={locale}>
      <div className={styles.profileHeader}>
        <OfficialElectionResultClaim
          label={labels.result}
          source={record.member_name.source}
        >
          <h3>{localizedConstituencyText(record.member_name.value, locale)}</h3>
        </OfficialElectionResultClaim>
        <OfficialElectionResultClaim
          label={labels.observation}
          source={record.constituency.source}
        >
          <p>
            {localizedConstituencyText(record.constituency.value, locale)}
            {record.constituency_no ? ` · ${record.constituency_no}` : ""}
            {record.reserved_category ? ` · ${record.reserved_category}` : ""}
          </p>
        </OfficialElectionResultClaim>
      </div>

      <div className={styles.profileClaims}>
        {record.party ? (
          <OfficialElectionResultClaim
            label={labels.party}
            source={record.party.source}
          >
            {localizedConstituencyText(record.party.value, locale)}
          </OfficialElectionResultClaim>
        ) : (
          <div className={styles.claim}>
            <span className={styles.claimLabel}>{labels.party}</span>
            <div className={styles.claimValue}>{labels.partyUnstated}</div>
          </div>
        )}
        <OfficialElectionResultClaim
          label={labels.district}
          source={record.district.source}
        >
          {localizedConstituencyText(record.district.value, locale)}
        </OfficialElectionResultClaim>
        <OfficialElectionResultClaim
          label={labels.term}
          source={record.term_period.source}
        >
          {localizedConstituencyText(record.term_period.value, locale)}
        </OfficialElectionResultClaim>
        <OfficialElectionResultClaim
          label={labels.electedVia}
          source={record.elected_via.source}
        >
          {electedViaLabel(record.elected_via.value, locale)}
        </OfficialElectionResultClaim>
        <OfficialElectionResultClaim
          label={labels.seatStatus}
          source={record.seat_status.source}
        >
          {seatStatusWord(record.seat_status.value, locale)}
        </OfficialElectionResultClaim>
        {record.member_sl_no ? (
          <OfficialElectionResultClaim
            label={labels.memberSlNo}
            source={record.member_name.source}
          >
            {record.member_sl_no}
          </OfficialElectionResultClaim>
        ) : null}
        {record.annotation ? (
          <OfficialElectionResultClaim
            label={labels.annotation}
            source={record.annotation.source}
          >
            {localizedConstituencyText(record.annotation.value, locale)}
          </OfficialElectionResultClaim>
        ) : null}
      </div>

      <div className={styles.share} aria-label={labels.shareHeading}>
        <p className="eyebrow">{labels.shareHeading}</p>
        <div className={styles.shareActions}>
          <a
            className="button"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            {labels.whatsapp}
          </a>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void copyLink()}
          >
            {copied ? labels.copied : labels.copyLink}
          </button>
        </div>
      </div>
    </article>
  );
}
