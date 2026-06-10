import { NextResponse } from "next/server";
import { getRedis, DATA_KEY, INITIAL_DATA, isValidData } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Anyone can read the leaderboard.
export async function GET() {
  try {
    const redis = getRedis();
    let data = await redis.get(DATA_KEY);
    if (!data) {
      // First boot: seed with the original season data.
      data = INITIAL_DATA;
      await redis.set(DATA_KEY, data);
    }
    return NextResponse.json({ data, admin: isAdmin() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Only the logged-in admin can write.
export async function PUT(request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!isValidData(body)) {
      return NextResponse.json({ error: "Invalid data shape" }, { status: 400 });
    }
    const redis = getRedis();
    await redis.set(DATA_KEY, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
