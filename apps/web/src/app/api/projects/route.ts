import { preparedProjects } from "@/lib/projects";

export function GET() {
  return Response.json({
    data: preparedProjects,
    status: "prepared-empty",
  });
}
