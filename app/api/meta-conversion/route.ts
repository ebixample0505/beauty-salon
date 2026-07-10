import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;

const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

export async function POST(req: NextRequest) {
  try {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Meta Pixel設定が未完了です' }, { status: 500 });
    }

    const body = await req.json();
    const {
      eventName = 'Reservation',
      eventId,
      phone,
      email,
      value,
      currency = 'JPY',
      lineUserId,
    } = body;

    // ブラウザのCookieから広告クリック情報を取得（同一ドメインなら自動で送られてくる）
    const fbp = req.cookies.get('_fbp')?.value;
    const fbc = req.cookies.get('_fbc')?.value;

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || '';
    const userAgent = req.headers.get('user-agent') || '';

    const userData: Record<string, unknown> = {};
    if (phone) userData.ph = [sha256(phone.replace(/[^0-9]/g, ''))];
    if (email) userData.em = [sha256(email)];
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;
    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;

    const eventPayload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId, // クライアント側のfbqイベントと重複排除するためのID
          action_source: 'website',
          user_data: userData,
          custom_data: value ? { value, currency } : undefined,
        },
      ],
    };

    const res = await fetch(
      `https://graph.facebook.com/v20.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
      }
    );

    const data = await res.json();
    console.log('Meta Conversions APIレスポンス:', JSON.stringify(data));

    if (!res.ok) {
      console.error('Meta Conversions APIエラー:', data);
      return NextResponse.json({ error: data }, { status: 400 });
    }

    // 管理画面でも確認できるよう、顧客データに広告クリック情報を残しておく
    if (lineUserId && fbc) {
      try {
        await updateDoc(doc(db, 'customers', lineUserId), {
          lastAdClickId: fbc,
          lastConversionEvent: eventName,
          lastConversionAt: new Date(),
        });
      } catch (e) {
        console.log('顧客データへの広告情報保存に失敗（致命的ではありません）:', e);
      }
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    console.error('コンバージョン送信エラー:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}