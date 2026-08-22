import type { Metadata } from "next";
import { SchemesDirectory } from "./SchemesDirectory";

export const metadata: Metadata = {
  title: "Schemes · FileKholo",
  description:
    "Browse reviewed, source-backed government scheme records across all States and Union Territories.",
};

export default function SchemesPage() {
  return <SchemesDirectory />;
}
