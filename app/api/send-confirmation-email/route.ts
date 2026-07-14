import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const SHOP_NAME = 'test美容室';

export async function POST(req: NextRequest) {
  try {
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
      return NextResponse.json({ error: 'メール送信設定が未完了です' }, { status: 500 });
    }

    const body = await req.json();
    const { to, name, menu, staffName, date, slot, price } = body;

    if (!to) {
      return NextResponse.json({ error: '送信先メールアドレスがありません' }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #2563eb;">ご予約ありがとうございます</h2>
        <p>${name} 様</p>
        <p>以下の内容でご予約を承りました。</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #888;">メニュー</td><td style="padding: 8px 0; text-align: right; font-weight: bold;">${menu}</td></tr>
          <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">担当スタッフ</td><td style="padding: 8px 0; text-align: right; font-weight: bold; border-top: 1px solid #eee;">${staffName || 'お任せ'}</td></tr>
          <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">日付</td><td style="padding: 8px 0; text-align: right; font-weight: bold; border-top: 1px solid #eee;">${date}</td></tr>
          <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">時間</td><td style="padding: 8px 0; text-align: right; font-weight: bold; border-top: 1px solid #eee;">${slot}</td></tr>
          <tr><td style="padding: 8px 0; color: #888; border-top: 1px solid #eee;">料金</td><td style="padding: 8px 0; text-align: right; font-weight: bold; color: #2563eb; border-top: 1px solid #eee;">${price}</td></tr>
        </table>
        <p style="font-size: 13px; color: #888;">ご来店を心よりお待ちしております。</p>
        <p style="font-size: 13px; color: #888;">${SHOP_NAME}</p>
      </div>
    `;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: SHOP_NAME, email: BREVO_SENDER_EMAIL },
        to: [{ email: to, name: name || undefined }],
        subject: `【${SHOP_NAME}】ご予約確認`,
        htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Brevo送信エラー:', data);
      return NextResponse.json({ error: data }, { status: 400 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('メール送信エラー:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}