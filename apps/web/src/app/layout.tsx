import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";
import { StateProvider } from "@/components/StateProvider";
import "./styles.css";

export const dynamic = "force-dynamic";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FileKholo",
    template: "%s",
  },
  description:
    "Open source-linked public records and follow national development across India, with Andhra Pradesh as the first fully reviewed dataset.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>
          <StateProvider>{children}</StateProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
