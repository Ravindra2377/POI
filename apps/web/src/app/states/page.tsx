import type { Metadata } from "next";
import { StatesDirectory } from "./StatesDirectory";

export const metadata: Metadata = {
  title: "All-India States & Union Territories Explorer — Viksit Bharat??",
  description:
    "Explore public civic intelligence, legislative structure, and official government records across all 28 States and 8 Union Territories of India.",
};

export default function StatesPage() {
  return <StatesDirectory />;
}
