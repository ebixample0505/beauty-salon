import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, name, email, phone, menu, date, slot, staffId, staffName, time, webUserId, pointsToUse } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '金額が無効です' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency: 'jpy',
      metadata: {
        name: String(name || ''),
        email: String(email || ''),
        phone: String(phone || ''),
        menu: String(menu || '').slice(0, 500),
        date: String(date || ''),
        slot: String(slot || ''),
        staffId: String(staffId || ''),
        staffName: String(staffName || ''),
        time: String(time || ''),
        webUserId: String(webUserId || ''),
        pointsToUse: String(pointsToUse || 0),
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('PaymentIntent作成エラー:', error);
    return NextResponse.json({ error: '決済の準備に失敗しました' }, { status: 500 });
  }
}
