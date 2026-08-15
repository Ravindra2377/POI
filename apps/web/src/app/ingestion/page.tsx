import type { Metadata } from "next";
import { IngestionContent } from "./IngestionContent";

export const metadata: Metadata = {
  title: "Data Ingestion · Viksit Bharat??",
  description:
    "Live status of every registered official data feed: raw snapshots, extraction runs and review decisions.",
};

export default function IngestionPage() {
  return <IngestionContent />;
}
