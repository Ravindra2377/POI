import type { Metadata } from "next";
import { VerificationDirectory } from "./VerificationDirectory";

export const metadata: Metadata = {
  title: "Verification · FileKholo",
  description:
    "Inspect calculated comparisons between official government claims and recorded outcomes, each paired with its sources.",
};

export default function VerificationPage() {
  return <VerificationDirectory />;
}
