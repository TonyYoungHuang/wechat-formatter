import { NextResponse } from "next/server";
import { defaultPlans } from "@/lib/entitlements/plans";

export async function GET() {
  return NextResponse.json({
    plans: defaultPlans,
    status: "placeholder",
    message: "Admin auth, pricing configuration, and quota configuration are reserved here.",
  });
}
