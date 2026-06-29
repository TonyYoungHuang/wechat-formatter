import { NextResponse } from "next/server";

import { requireWorkspaceOwner } from "@/lib/auth/session";
import { getPaymentConfigurationStatus } from "@/lib/billing/payment-config";
import { mapApiError } from "@/lib/http/errors";

export async function GET() {
  try {
    await requireWorkspaceOwner();

    return NextResponse.json(getPaymentConfigurationStatus());
  } catch (error) {
    return mapApiError(error);
  }
}
