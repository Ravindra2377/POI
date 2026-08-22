import type { Metadata } from "next";
import { PublicMoneyDirectory } from "./PublicMoneyDirectory";

export const metadata: Metadata = {
  title: "Public Money · FileKholo",
  description:
    "Inspect reviewed Andhra Pradesh public-money observations by stage without collapsing promises, spending and outcomes.",
};

export default function PublicMoneyPage() {
  return <PublicMoneyDirectory />;
}
