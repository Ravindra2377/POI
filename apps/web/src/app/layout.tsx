import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./styles.css";

export const metadata: Metadata = {
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
