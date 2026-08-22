import type { Metadata } from "next";
import { AdminConsole } from "./AdminConsole";

export const metadata: Metadata = {
  title: "Staff moderation | FileKholo",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
