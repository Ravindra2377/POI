import type { Metadata } from "next";
import { AccountContent } from "./AccountContent";

export const metadata: Metadata = {
  title: "Account · Viksit Bharat??",
  description:
    "Prepared, honest account state. Nothing about you is collected today; consent and review controls are not built.",
};

export default function AccountPage() {
  return <AccountContent />;
}
