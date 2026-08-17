import type { Metadata } from "next";
import { ModerationLogContent } from "./ModerationLogContent";

export const metadata: Metadata = {
  title: "Public Moderation Audit Log | Andhra Pradesh Civic Intelligence",
  description:
    "Audited public record of all platform moderation actions, flags, approvals, and reason codes to guarantee platform integrity.",
};

export default function ModerationLogPage() {
  return <ModerationLogContent />;
}
