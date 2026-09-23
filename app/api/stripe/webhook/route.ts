import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Stripe from 'stripe';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'stripe-signatureヘッダーがありません' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook署名エラー:', err);
    return NextResponse.json({ error: 'Webhook署名が無効です' }, { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { metadata } = paymentIntent;

    // 重複保存を防ぐためにstripePaymentIntentIdで確認
    const existing = await getDocs(
      query(collection(db, 'bookings'), where('stripePaymentIntentId', '==', paymentIntent.id))
    );

    if (existing.empty) {
      await addDoc(collection(db, 'bookings'), {
        stripePaymentIntentId: paymentIntent.id,
        lineUserId: metadata.webUserId || '',
        name: metadata.name || '',
        phone: metadata.phone || '',
        email: metadata.email || '',
        menu: metadata.menu || '',
        date: metadata.date || '',
        slot: metadata.slot || '',
        price: `¥${paymentIntent.amount.toLocaleString()}`,
        time: metadata.time || '',
        staffId: metadata.staffId || '',
        staffName: metadata.staffName || '',
        pointsRequested: parseInt(metadata.pointsToUse || '0', 10),
        paidAmount: paymentIntent.amount,
        status: 'confirmed',
        channel: 'web',
        createdAt: new Date(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
