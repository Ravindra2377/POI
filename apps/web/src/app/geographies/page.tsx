import type { Metadata } from "next";
import { GeographiesDirectory } from "./GeographiesDirectory";

export const metadata: Metadata = {
  title: "All-India Districts & Geography Explorer — Viksit Bharat??",
  description:
    "Explore official Local Government Directory (LGD) districts, administrative divisions, and native script geography profiles across all 36 States and Union Territories of India.",
};

export default function GeographiesPage() {
  return <GeographiesDirectory />;
}
