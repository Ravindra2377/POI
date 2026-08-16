import type { Metadata } from "next";
import { KnowYourConstituency } from "./KnowYourConstituency";

export const metadata: Metadata = {
  title: "Know Your Constituency · Viksit Bharat??",
  description:
    "Find your Andhra Pradesh Assembly constituency, its MLA, party and seat status from reviewed, source-linked records. Coarse geography only — your choice stays in the web address.",
};

export default function KnowYourConstituencyPage() {
  return <KnowYourConstituency />;
}
