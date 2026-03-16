import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const masterPass = process.env.MASTER_PASS_NET;

    if (!masterPass) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: password === masterPass });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
