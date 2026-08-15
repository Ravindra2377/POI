import type { Metadata } from "next";
import { CommunityContent } from "./CommunityContent";

export const metadata: Metadata = {
  title: "Community · Viksit Bharat??",
  description:
    "Prepared structure for future evidence-based civic participation. No poll result here represents India or Andhra Pradesh.",
};

export default function CommunityPage() {
  return <CommunityContent />;
}
