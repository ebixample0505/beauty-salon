'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await liff.init({ liffId: '2010454791-miMuAYxd' });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const profile = await liff.getProfile();
        setUserName(profile.displayName);

        // クリック計測
        const searchParams = new URLSearchParams(window.location.search);
        const mid = searchParams.get('mid');
        if (mid) {
          const { db } = await import('@/lib/firebase');
          const { doc, updateDoc, increment } = await import('firebase/firestore');
          await updateDoc(doc(db, 'messages', mid), {
            clickCount: increment(1),
          });
        }
      } catch (e) {
        console.error(e);
        setUserName('ゲスト');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const menus = [
    { id: 1, name: 'カット', time: '60分', price: '¥4,000' },
    { id: 2, name: 'カラー', time: '90分', price: '¥8,000' },
    { id: 3, name: 'パーマ', time: '120分', price: '¥12,000' },
    { id: 4, name: 'カット + カラー', time: '120分', price: '¥11,000' },
    { id: 5, name: 'カット + パーマ', time: '150分', price: '¥15,000' },
    { id: 6, name: 'トリートメント', time: '30分', price: '¥3,000' },
    { id: 7, name: 'ヘッドスパ', time: '45分', price: '¥5,000' },
    { id: 8, name: 'まつげエクステ', time: '90分', price: '¥8,000' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-6">
        <h1 className="text-xl font-bold">test美容室</h1>
        <p className="text-sm mt-1">こんにちは、{userName}さん</p>
      </div>

      <div className="p-4">
        {/* メニュー選択 */}
        <h2 className="text-lg font-bold mb-4">メニューを選択してください</h2>
        <div className="space-y-3">
          {menus.map((menu) => (
            <button
              key={menu.id}
              onClick={() => router.push(`/staff?menu=${menu.name}&time=${menu.time}&price=${menu.price}`)}
              className="w-full bg-white rounded-xl p-4 shadow flex justify-between items-center"
            >
              <div className="text-left">
                <p className="font-bold">{menu.name}</p>
                <p className="text-sm text-gray-500">{menu.time}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-600 font-bold">{menu.price}</p>
                <p className="text-gray-400 text-xs">›</p>
              </div>
            </button>
          ))}
        </div>

        {/* クーポンボタン */}
        <button
          onClick={() => router.push('/coupon')}
          className="w-full mt-6 bg-yellow-400 text-white rounded-xl p-4 font-bold"
        >
          クーポンを見る
        </button>

        {/* マイページボタン */}
        <button
          onClick={() => router.push('/mypage')}
          className="w-full mt-3 border border-blue-600 text-blue-600 rounded-xl p-4 font-bold"
        >
          予約確認・キャンセル
        </button>
      </div>
    </div>
  );
}