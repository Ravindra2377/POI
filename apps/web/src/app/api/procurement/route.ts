import { preparedProcurement } from "@/lib/procurement";

export function GET() {
  return Response.json({
    data: preparedProcurement,
    status: "prepared-empty",
  });
}
