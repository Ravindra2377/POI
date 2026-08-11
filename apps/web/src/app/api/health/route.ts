import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "ap-civic-web",
    status: "ok",
    version: "0.1.0",
  });
}
