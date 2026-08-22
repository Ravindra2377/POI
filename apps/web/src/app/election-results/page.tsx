import type { Metadata } from "next";
import { ElectionResultsDirectory } from "./ElectionResultsDirectory";

export const metadata: Metadata = {
  title: "Election Results · FileKholo",
  description:
    "Inspect reviewed Andhra Pradesh election results with constituency, party and official sources.",
};

export default function ElectionResultsPage() {
  return <ElectionResultsDirectory />;
}
