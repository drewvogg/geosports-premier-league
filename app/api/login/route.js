import { NextResponse } from "next/server";
import { checkPassword, sessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!checkPassword(password)) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionToken(), sessionCookieOptions);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
