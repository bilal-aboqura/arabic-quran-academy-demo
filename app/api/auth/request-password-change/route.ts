import { NextResponse } from "next/server";

/**
 * Disabled security boundary. The legacy implementation stored plaintext
 * passwords for staff approval. A token-based reset will replace it once the
 * coordinated schema migration and delivery provider are available.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "إعادة تعيين كلمة المرور الآمنة قيد التفعيل. لا ترسل كلمة المرور عبر هذا النموذج.",
      code: "PASSWORD_RESET_UNAVAILABLE",
    },
    { status: 410 },
  );
}
