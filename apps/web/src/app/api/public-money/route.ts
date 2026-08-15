import { preparedPublicMoney } from "@/lib/public-money";

export function GET() {
  return Response.json({
    data: preparedPublicMoney,
    status: "prepared-empty",
  });
}
