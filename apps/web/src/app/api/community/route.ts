import { preparedCommunity } from "@/lib/community";

export function GET() {
  return Response.json({
    data: preparedCommunity,
    status: "prepared-closed",
  });
}
