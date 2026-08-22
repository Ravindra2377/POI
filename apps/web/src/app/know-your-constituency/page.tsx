import type { Metadata } from "next";
import { KnowYourConstituency } from "./KnowYourConstituency";

const defaultDescription =
  "Find your Andhra Pradesh Assembly constituency, its MLA, party and seat status from reviewed, source-linked records. Coarse geography only — your choice stays in the web address.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    district?: string | string[];
    seat?: string | string[];
  }>;
}): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const district = Array.isArray(params.district)
    ? params.district[0]
    : params.district;
  const seat = Array.isArray(params.seat) ? params.seat[0] : params.seat;
  if (!district) {
    return {
      title: "Know Your Constituency · FileKholo",
      description: defaultDescription,
    };
  }
  const metadata: Metadata = {
    title: `Know Your Constituency · ${district} · FileKholo`,
    description: `Your MLA, party and seat status for ${district}, from reviewed, source-linked Andhra Pradesh Assembly records.`,
  };
  if (seat) {
    const image = `/og/constituency/${encodeURIComponent(seat)}/opengraph-image`;
    const twitterImage = `/og/constituency/${encodeURIComponent(
      seat,
    )}/twitter-image`;
    metadata.openGraph = { images: [image] };
    metadata.twitter = { images: [twitterImage] };
  }
  return metadata;
}

export default function KnowYourConstituencyPage() {
  return <KnowYourConstituency />;
}
