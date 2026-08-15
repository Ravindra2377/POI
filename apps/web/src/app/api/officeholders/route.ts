import { preparedOfficeholders } from "@/lib/officeholders";

export function GET() {
  return Response.json({
    data: preparedOfficeholders,
    status: "prepared-empty",
  });
}
