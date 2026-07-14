'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { getCustomer } from '@/lib/customer';
import BookingSteps from '@/components/BookingSteps';

const parsePriceToNumber = (priceStr: string): number => {
  const digits = priceStr.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
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
  const webUserId = searchParams.get('webUserId') || '';

  const priceNum = parsePriceToNumber(price);
  const maxUsablePoints = Math.min(pointsBalance, priceNum);
  const pointsToUseNum = Math.min(Math.max(parseInt(pointsToUse || '0', 10) || 0, 0), maxUsablePoints);
  const discountedPrice = priceNum - pointsToUseNum;

  useEffect(() => {
    const init = async () => {
      if (!webUserId) return;
      const customer = await getCustomer(webUserId);
      if (customer) setPointsBalance(customer.points || 0);
    };
    init();
  }, [webUserId]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
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
        status: 'confirmed',
        channel: 'web',
        createdAt: new Date(),
      });

      // 予約確認メールを送信
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
    } catch (e) {
      console.error('保存エラー:', e);
      alert('保存に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
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
                className="text-xs text-blue-600 font-bold border border-blue-600 rounded-lg px-2 py-1"
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

        <p className="text-sm text-gray-500 text-center mb-4">上記の内容で予約を確定します</p>

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg disabled:opacity-50"
        >
          {loading ? '処理中...' : '予約を確定する'}
        </button>

        <button
          onClick={() => router.back()}
          className="w-full mt-3 border border-gray-300 text-gray-600 rounded-xl p-4 font-bold"
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
      <ConfirmContent />
    </Suspense>
  );
}