import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!correctPassword) {
    return NextResponse.json({ error: 'Password not set' }, { status: 500 });
  }

  if (password === correctPassword) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
}