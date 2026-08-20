import type { Metadata } from "next";
import { AccountContent } from "./AccountContent";

export const metadata: Metadata = {
  title: "Account · Viksit Bharat??",
  description:
    "Read-only pseudonymous citizen profile surface for the public-data beta.",
};

export default function AccountPage() {
  return <AccountContent />;
}
