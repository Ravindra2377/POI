import type { Metadata } from "next";
import { VerificationDirectory } from "./VerificationDirectory";

export const metadata: Metadata = {
  title: "Verification · Viksit Bharat??",
  description:
    "Inspect calculated comparisons between official government claims and recorded outcomes, each paired with its sources.",
};

export default function VerificationPage() {
  return <VerificationDirectory />;
}
