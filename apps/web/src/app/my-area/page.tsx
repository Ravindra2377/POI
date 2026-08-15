import type { Metadata } from "next";
import { MyArea } from "./MyArea";

export const metadata: Metadata = {
  title: "My Area · Viksit Bharat??",
  description:
    "A coarse, source-first briefing for a selected Andhra Pradesh district. No precise location is collected.",
};

export default function MyAreaPage() {
  return <MyArea />;
}
