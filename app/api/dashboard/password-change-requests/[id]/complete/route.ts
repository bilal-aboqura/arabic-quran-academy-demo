import { NextResponse } from "next/server";

/** Legacy plaintext-password queue is permanently retired. */
export async function POST() {
  return NextResponse.json(
    { error: "هذا المسار تم إيقافه لأسباب أمنية.", code: "PASSWORD_RESET_RETIRED" },
    { status: 410 },
  );
}
