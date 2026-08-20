import type { Metadata } from "next";
import { AdminConsole } from "./AdminConsole";

export const metadata: Metadata = {
  title: "Staff moderation | Viksit Bharat??",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
