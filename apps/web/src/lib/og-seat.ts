import { seatBySlug } from "@/lib/know-your-constituency";
import type { ElectionResultRecord } from "@/lib/election-results";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const ogSeatAlt = "Know Your Constituency · Viksit Bharat";

export async function loadSeatRecord(
  seatSlug: string | undefined,
): Promise<ElectionResultRecord | null> {
  if (!seatSlug) return null;
  try {
    const response = await fetch(`${API_URL}/api/v1/election-results`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data: ElectionResultRecord[];
    };
    return seatBySlug(payload.data, seatSlug);
  } catch {
    return null;
  }
}
