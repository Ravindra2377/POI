import type { Metadata } from "next";
import { GovernmentExplorer } from "./GovernmentExplorer";

export const metadata: Metadata = {
  title: "Government Explorer · Viksit Bharat??",
  description:
    "Browse sourced Andhra Pradesh district and government department records.",
};

export default function GovernmentExplorerPage() {
  return <GovernmentExplorer />;
}
