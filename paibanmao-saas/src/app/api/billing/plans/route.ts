import { NextResponse } from "next/server";
import { defaultPlans } from "@/lib/entitlements/plans";

export async function GET() {
  return NextResponse.json({
    plans: defaultPlans,
    configurable: true,
    note: "Pricing and quota controls are reserved for admin configuration.",
  });
}
