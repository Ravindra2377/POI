import type { ReactElement } from "react";
import type { ElectionResultRecord } from "@/lib/election-results";

export const ogSize = { width: 1200, height: 630 } as const;
export const ogContentType = "image/png";

const NAVY = "#0e2a4f";
const BLUE = "#1558a6";
const TEXT = "#ffffff";
const MUTED = "#c7d6ea";

function line(content: string): string {
  return content || "\u00a0";
}

function paragraph(content: string): string {
  return content ? `${content}\u00a0·\u00a0` : "";
}

export function ogCard({
  seat,
}: {
  seat: ElectionResultRecord | null;
}): ReactElement {
  const seatName = seat ? seat.constituency.value.en : "Know Your Constituency";
  const member = seat ? seat.member_name.value.en : "";
  const party = seat?.party?.value.en ?? "";
  const district = seat ? seat.district.value.en : "";
  const term = seat ? seat.term_period.value.en : "";
  const status = seat ? seat.seat_status.value : "";
  const constituencyNo = seat?.constituency_no ?? "";

  return (
    <div
      style={{
        background: NAVY,
        color: TEXT,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            color: MUTED,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          Viksit Bharat · Andhra Pradesh
        </div>
        <div
          style={{
            fontSize: 76,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            marginTop: 14,
          }}
        >
          {seatName}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {seat ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 46,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {member}
            </div>
            <div
              style={{
                color: MUTED,
                display: "flex",
                flexDirection: "row",
                fontSize: 30,
                marginTop: 10,
              }}
            >
              {paragraph(party)}
              {paragraph(district)}
              {constituencyNo ? `Constituency ${constituencyNo}` : ""}
            </div>
            <div
              style={{
                color: MUTED,
                display: "flex",
                flexDirection: "row",
                fontSize: 24,
                marginTop: 6,
              }}
            >
              {paragraph(term)}
              {status}
            </div>
          </div>
        ) : (
          <div
            style={{
              color: MUTED,
              fontSize: 34,
              lineHeight: 1.4,
            }}
          >
            Government records. One place to check. Find your district, your
            seat and your MLA from reviewed, source-linked records.
          </div>
        )}
      </div>

      <div
        style={{
          alignItems: "center",
          borderTop: `1px solid ${BLUE}`,
          color: MUTED,
          display: "flex",
          fontSize: 22,
          paddingTop: 22,
        }}
      >
        {line("Official · Reviewed · Source-linked record")}
      </div>
    </div>
  );
}
