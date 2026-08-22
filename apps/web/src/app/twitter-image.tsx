import { ImageResponse } from "next/og";
import { ogCard, ogContentType, ogSize } from "@/lib/og-card";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Know Your Constituency · FileKholo";

export default function Image() {
  return new ImageResponse(ogCard({ seat: null }), size);
}
