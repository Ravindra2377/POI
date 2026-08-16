import { ImageResponse } from "next/og";
import { ogCard, ogContentType, ogSize } from "@/lib/og-card";
import { loadSeatRecord, ogSeatAlt } from "@/lib/og-seat";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = ogSeatAlt;
export const dynamic = "force-dynamic";

export default async function Image({
  params,
}: {
  params: Promise<{ seat: string }>;
}) {
  const { seat } = await params;
  const seatRecord = await loadSeatRecord(seat);
  return new ImageResponse(ogCard({ seat: seatRecord }), size);
}
