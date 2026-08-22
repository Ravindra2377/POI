import type { Metadata } from "next";
import { CommunityContent } from "./CommunityContent";

export const metadata: Metadata = {
  title: "Community · FileKholo",
  description:
    "Read published community records and moderation transparency during the read-only public-data beta.",
};

export default function CommunityPage() {
  return <CommunityContent />;
}
