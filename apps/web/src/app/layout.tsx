import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./styles.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Viksit Bharat??",
    template: "%s",
  },
  description:
    "An independent India-wide civic platform for inspecting sourced government records, with Andhra Pradesh as the first reviewed dataset.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
