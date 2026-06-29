import { NextResponse } from "next/server";
import { getPlanConfigs } from "@/lib/entitlements/service";

export async function GET() {
  const plans = await getPlanConfigs();

  return NextResponse.json({
    plans,
    configurable: true,
    note: "Pricing and quota controls are loaded from admin configuration when present.",
  });
}
