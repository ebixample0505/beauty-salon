import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { targets, content } = await req.json();

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 500 });
    }

    // 各ユーザーにメッセージ送信
    const results = await Promise.allSettled(
      targets.map(async (userId: string) => {
        const res = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: userId,
            messages: [{ type: 'text', text: content }],
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(JSON.stringify(error));
        }
        return res.json();
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ succeeded, failed });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to send messages' }, { status: 500 });
  }
}