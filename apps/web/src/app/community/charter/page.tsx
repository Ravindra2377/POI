import type { Metadata } from "next";
import { CharterContent } from "./CharterContent";

export const metadata: Metadata = {
  title: "Community Charter · FileKholo",
  description:
    "The rules of participation, written before community participation opens. Evidence stays labeled and community experience is never official fact.",
};

export default function CharterPage() {
  return <CharterContent />;
}
