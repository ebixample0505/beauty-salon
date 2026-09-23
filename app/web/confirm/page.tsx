'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { getCustomer } from '@/lib/customer';
import BookingSteps from '@/components/BookingSteps';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const parsePriceToNumber = (priceStr: string): number => {
  const digits = priceStr.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

const FIELD_STYLE = {
  style: {
    base: {
      fontSize: '16px',
      color: '#374151',
      fontFamily: 'system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState('');
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsToUse, setPointsToUse] = useState('');

  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';
  const date = searchParams.get('date') || '';
  const slot = searchParams.get('slot') || '';
  const name = searchParams.get('name') || '';
  const phone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';
  const staffId = searchParams.get('staffId') || '';
  const staffName = searchParams.get('staffName') || 'お任せ';
  const nominationFee = searchParams.get('nominationFee') || '0';
  const webUserId = searchParams.get('webUserId') || '';

  const priceNum = parsePriceToNumber(price);
  const maxUsablePoints = Math.min(pointsBalance, priceNum);
  const pointsToUseNum = Math.min(Math.max(parseInt(pointsToUse || '0', 10) || 0, 0), maxUsablePoints);
  const discountedPrice = priceNum - pointsToUseNum;
  const needsPayment = discountedPrice > 0;

  const handleEditCustomer = () => {
    router.push(
      `/web/profile?menu=${encodeURIComponent(menu)}&time=${encodeURIComponent(time)}&price=${encodeURIComponent(price)}&date=${date}&slot=${slot}&staffId=${staffId}&staffName=${encodeURIComponent(staffName)}&nominationFee=${nominationFee}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&webUserId=${webUserId}&editCustomer=1`
    );
  };

  useEffect(() => {
    const init = async () => {
      if (!webUserId) return;
      const customer = await getCustomer(webUserId);
      if (customer) setPointsBalance(customer.points || 0);
    };
    init();
  }, [webUserId]);

  const saveBookingAndComplete = async (paymentIntentId: string | null) => {
    const docRef = await addDoc(collection(db, 'bookings'), {
      lineUserId: webUserId,
      name,
      phone,
      email,
      menu,
      date,
      slot,
      price,
      time,
      staffId,
      staffName,
      pointsRequested: pointsToUseNum,
      discountedPrice,
      paidAmount: discountedPrice,
      stripePaymentIntentId: paymentIntentId,
      status: 'confirmed',
      channel: 'web',
      createdAt: new Date(),
    });

    try {
      await fetch('/api/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          name,
          menu,
          staffName,
          date,
          slot,
          price: discountedPrice > 0 ? `¥${discountedPrice.toLocaleString()}` : price,
        }),
      });
    } catch (e) {
      console.log('メール送信エラー:', e);
    }

    router.push(
      `/web/complete?menu=${encodeURIComponent(menu)}&time=${encodeURIComponent(time)}&price=${encodeURIComponent(price)}&date=${date}&slot=${slot}&staffName=${encodeURIComponent(staffName)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&bookingId=${docRef.id}&finalAmount=${discountedPrice}&webUserId=${webUserId}`
    );
  };

  const handleConfirm = async () => {
    setLoading(true);
    setCardError('');

    try {
      // ポイントで全額カバーする場合はStripe不要
      if (!needsPayment) {
        await saveBookingAndComplete(null);
        return;
      }

      // PaymentIntentを作成
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: discountedPrice,
          name,
          email,
          phone,
          menu,
          date,
          slot,
          staffId,
          staffName,
          time,
          webUserId,
          pointsToUse: pointsToUseNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '決済の準備に失敗しました');
      }

      const { clientSecret } = await res.json();

      const cardNumberElement = elements?.getElement(CardNumberElement);
      if (!stripe || !cardNumberElement) {
        throw new Error('Stripeの読み込みに失敗しました。ページを再読み込みしてください。');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: { name, email },
        },
      });

      if (error) {
        setCardError(error.message || '決済に失敗しました。カード情報を確認してください。');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await saveBookingAndComplete(paymentIntent.id);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '決済に失敗しました。もう一度お試しください。';
      console.error('決済エラー:', e);
      setCardError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2 cursor-pointer">← 戻る</button>
        <h1 className="text-xl font-bold">予約内容の確認</h1>
      </div>

      <BookingSteps current={5} />

      <div className="p-4">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="font-bold text-lg mb-4 text-gray-700">予約内容</h2>
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">お名前</span>
              <span className="font-bold">{name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">電話番号</span>
              <span className="font-bold">{phone}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">メール</span>
              <span className="font-bold">{email}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">メニュー</span>
              <span className="font-bold">{menu}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">担当スタッフ</span>
              <span className="font-bold">{staffName}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">所要時間</span>
              <span className="font-bold">{time}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">日付</span>
              <span className="font-bold">{date}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">時間</span>
              <span className="font-bold">{slot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">料金</span>
              <span className="font-bold text-blue-600 text-lg">{price}</span>
            </div>
          </div>
        </div>

        {pointsBalance > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold text-lg mb-3 text-gray-700">ポイントを利用する</h2>
            <p className="text-sm text-gray-500 mb-3">
              保有ポイント：<span className="font-bold text-blue-600">{pointsBalance}pt</span>
            </p>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                min={0}
                max={maxUsablePoints}
                value={pointsToUse}
                onChange={e => setPointsToUse(e.target.value)}
                placeholder="0"
                className="flex-1 border rounded-lg p-3 text-lg"
              />
              <span className="text-gray-500 font-bold">pt 利用</span>
              <button
                onClick={() => setPointsToUse(String(maxUsablePoints))}
                className="text-xs text-blue-600 font-bold border border-blue-600 rounded-lg px-2 py-1 cursor-pointer"
              >
                全部使う
              </button>
            </div>
            {pointsToUseNum > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-gray-600">お支払い予定額</span>
                <div className="text-right">
                  <span className="text-sm text-gray-400 line-through mr-2">{price}</span>
                  <span className="font-bold text-blue-600 text-lg">¥{discountedPrice.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {needsPayment && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold text-lg mb-1 text-gray-700">クレジットカード情報</h2>
            <p className="text-xs text-gray-400 mb-4">Stripeにより安全に処理されます</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">カード番号</label>
                <div className="border rounded-lg p-3 bg-gray-50">
                  <CardNumberElement options={FIELD_STYLE} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">有効期限（月/年）</label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <CardExpiryElement options={FIELD_STYLE} />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-500 mb-1">CVC</label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <CardCvcElement options={FIELD_STYLE} />
                  </div>
                </div>
              </div>
            </div>
            {cardError && (
              <p className="mt-3 text-sm text-red-500">{cardError}</p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-400">🔒 SSL暗号化による安全な決済</span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-xl p-4 mb-4 flex justify-between items-center">
          <span className="font-bold text-gray-700">お支払い金額</span>
          <span className="font-bold text-blue-600 text-xl">
            {needsPayment ? `¥${discountedPrice.toLocaleString()}` : '¥0（ポイント全額利用）'}
          </span>
        </div>

        <p className="text-sm text-gray-500 text-center mb-4">上記の内容で予約を確定します</p>

        <button
          onClick={handleConfirm}
          disabled={loading || (needsPayment && !stripe)}
          className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg disabled:opacity-50 cursor-pointer"
        >
          {loading ? '処理中...' : needsPayment ? '予約・お支払いを確定する' : '予約を確定する'}
        </button>

        <button
          onClick={handleEditCustomer}
          className="w-full mt-3 border border-gray-300 text-gray-600 rounded-xl p-4 font-bold cursor-pointer"
        >
          修正する
        </button>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <Elements stripe={stripePromise}>
        <ConfirmContent />
      </Elements>
    </Suspense>
  );
}
