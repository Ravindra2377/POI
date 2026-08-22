import type { Metadata } from "next";
import { OfficeholdersDirectory } from "./OfficeholdersDirectory";

export const metadata: Metadata = {
  title: "Officeholders · FileKholo",
  description:
    "Inspect reviewed Andhra Pradesh roles and terms without treating an office as a verdict on a person.",
};

export default function OfficeholdersPage() {
  return <OfficeholdersDirectory />;
}
