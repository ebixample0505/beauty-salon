'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import liff from '@line/liff';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

type Menu = {
  id: string;
  name: string;
  time: string;
  price: string;
  description?: string;
  isActive: boolean;
  order: number;
};

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menusLoading, setMenusLoading] = useState(true);

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

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const q = query(collection(db, 'menus'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Menu)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setMenus(data);
      } catch (e) {
        console.error('メニュー取得エラー:', e);
      } finally {
        setMenusLoading(false);
      }
    };
    fetchMenus();
  }, []);

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

        {menusLoading ? (
          <p className="text-center text-gray-400 py-12">読み込み中...</p>
        ) : menus.length === 0 ? (
          <p className="text-center text-gray-400 py-12">現在ご案内できるメニューがありません</p>
        ) : (
          <div className="space-y-3">
            {menus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => router.push(`/staff?menu=${menu.name}&time=${menu.time}&price=${menu.price}`)}
                className="w-full bg-white rounded-xl p-4 shadow flex justify-between items-center"
              >
                <div className="text-left">
                  <p className="font-bold">{menu.name}</p>
                  {menu.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{menu.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{menu.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 font-bold">{menu.price}</p>
                  <p className="text-gray-400 text-xs">›</p>
                </div>
              </button>
            ))}
          </div>
        )}

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