import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth/session";
import { getPaymentConfigurationStatus } from "@/lib/billing/payment-config";
import { mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    await requireCurrentUser();

    return NextResponse.json(getPaymentConfigurationStatus());
  } catch (error) {
    return mapApiError(error);
  }
}
