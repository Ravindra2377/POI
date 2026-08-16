import {
  preparedPublicMoney,
  type PublicMoneyCatalogResponse,
} from "@/lib/public-money";

// The public-money slice models financial observations across eleven stages
// (announcement → outcome). No API endpoint currently produces that shape, so
// this proxy serves the explicitly labelled prepared-only contract instead of
// type-casting an unrelated payload (e.g. /api/v1/budget BudgetLineOut) into
// PublicMoneyRecord. Wire a faithful mapping here when a matching endpoint exists.
export async function GET(): Promise<Response> {
  const body: PublicMoneyCatalogResponse = {
    data: [...preparedPublicMoney],
    status: "prepared-empty",
  };
  return Response.json(body);
}
