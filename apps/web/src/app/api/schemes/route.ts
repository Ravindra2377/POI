import { preparedSchemes } from "@/lib/schemes";

export function GET() {
  return Response.json({
    data: preparedSchemes,
    status: "prepared-empty",
  });
}
