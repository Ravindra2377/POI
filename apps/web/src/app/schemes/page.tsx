import type { Metadata } from "next";
import { SchemesDirectory } from "./SchemesDirectory";

export const metadata: Metadata = {
  title: "AP Schemes · Viksit Bharat??",
  description:
    "Browse reviewed, bilingual and source-backed Andhra Pradesh scheme records.",
};

export default function SchemesPage() {
  return <SchemesDirectory />;
}
