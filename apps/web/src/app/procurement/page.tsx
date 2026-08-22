import type { Metadata } from "next";
import { ProcurementDirectory } from "./ProcurementDirectory";

export const metadata: Metadata = {
  title: "Procurement · FileKholo",
  description:
    "Inspect reviewed Andhra Pradesh tender and contract observations without confusing estimates, awards and outcomes.",
};

export default function ProcurementPage() {
  return <ProcurementDirectory />;
}
