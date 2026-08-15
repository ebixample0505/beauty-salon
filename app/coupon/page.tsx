'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs,
  doc, setDoc, getDoc
} from 'firebase/firestore';
import liff from '@line/liff';

type Coupon = {
  id: string;
  title: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  code: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};

export default function CouponPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [lineUserId, setLineUserId] = useState('temp-user');
  const [usedCouponIds, setUsedCouponIds] = useState<string[]>([]);
  const [usingCoupon, setUsingCoupon] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      let uid = 'temp-user';
      try {
        await liff.init({ liffId: '2010454791-miMuAYxd' });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          uid = profile.userId;
          setLineUserId(uid);
        }
      } catch (e) {
        console.log('LIFF初期化エラー:', e);
      }
      await fetchCoupons();
      await fetchUsedCoupons(uid);
      setLoading(false);
    };
    init();
  }, []);

  const fetchCoupons = async () => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'coupons'),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }) as Coupon)
      .filter(c => c.validFrom <= today && c.validUntil >= today);
    setCoupons(data);
  };

  const fetchUsedCoupons = async (uid: string) => {
    const q = query(
      collection(db, 'usedCoupons'),
      where('lineUserId', '==', uid)
    );
    const snapshot = await getDocs(q);
    setUsedCouponIds(snapshot.docs.map(d => d.data().couponId));
  };

  const handleUseCoupon = async (coupon: Coupon) => {
    if (usedCouponIds.includes(coupon.id)) return;
    setUsingCoupon(coupon.id);
    try {
      await setDoc(doc(db, 'usedCoupons', `${lineUserId}_${coupon.id}`), {
        lineUserId,
        couponId: coupon.id,
        couponTitle: coupon.title,
        usedAt: new Date(),
      });
      setUsedCouponIds(prev => [...prev, coupon.id]);
      alert(`「${coupon.title}」を使用しました！\nスタッフにこの画面をご提示ください。`);
    } catch (e) {
      console.error(e);
    } finally {
      setUsingCoupon(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.push('/')} className="text-sm mb-2 cursor-pointer">← 戻る</button>
        <h1 className="text-xl font-bold">クーポン一覧</h1>
        <p className="text-sm mt-1 text-blue-100">お得なクーポンをご利用ください</p>
      </div>

      <div className="p-4">
        {coupons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">🎟️</p>
            <p>現在利用できるクーポンはありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map(coupon => {
              const isUsed = usedCouponIds.includes(coupon.id);
              return (
                <div
                  key={coupon.id}
                  className={`bg-white rounded-xl shadow overflow-hidden ${isUsed ? 'opacity-60' : ''}`}
                >
                  {/* クーポンヘッダー */}
                  <div className="bg-blue-600 text-white px-4 py-3 flex justify-between items-center">
                    <span className="font-bold text-lg">
                      {coupon.discountType === 'percent'
                        ? `${coupon.discountValue}% OFF`
                        : `¥${coupon.discountValue.toLocaleString()} OFF`}
                    </span>
                    {isUsed && (
                      <span className="bg-white text-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                        使用済み
                      </span>
                    )}
                  </div>

                  {/* クーポン内容 */}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{coupon.title}</h3>
                    <p className="text-gray-500 text-sm mb-3">{coupon.description}</p>
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
                      <span>コード: {coupon.code}</span>
                      <span>有効期限: {coupon.validUntil}</span>
                    </div>

                    {/* 点線 */}
                    <div className="border-t border-dashed border-gray-300 mb-4" />

                    <button
                      onClick={() => handleUseCoupon(coupon)}
                      disabled={isUsed || usingCoupon === coupon.id}
                      className={`w-full py-3 rounded-xl font-bold text-sm ${
                        isUsed
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white cursor-pointer'
                      }`}
                    >
                      {isUsed ? '使用済み' : usingCoupon === coupon.id ? '処理中...' : 'クーポンを使う'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}