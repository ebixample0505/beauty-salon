'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salonId = searchParams.get('salonId') || '';

  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!salonId) {
      router.replace('/');
      return;
    }
    const fetchMenus = async () => {
      try {
        const q = query(
          collection(db, 'salons', salonId, 'menus'),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Menu)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setMenus(data);
      } catch (e) {
        console.error('メニュー取得エラー:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, [salonId, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button
          onClick={() => router.push(`/salon/${salonId}`)}
          className="text-sm mb-2 cursor-pointer opacity-80"
        >
          ← 店舗詳細に戻る
        </button>
        <h1 className="text-xl font-bold">メニューを選択</h1>
      </div>

      {/* ステップ表示 */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center gap-1 text-xs">
          <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold shrink-0">1</span>
          <span className="text-blue-600 font-bold">メニュー</span>
          <span className="text-gray-300 mx-1">›</span>
          <span className="text-gray-300">2 スタイリスト</span>
          <span className="text-gray-300 mx-1">›</span>
          <span className="text-gray-300">3 日時</span>
          <span className="text-gray-300 mx-1">›</span>
          <span className="text-gray-300">4 お客様情報</span>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <p className="text-center text-gray-400 py-12">読み込み中...</p>
        ) : menus.length === 0 ? (
          <p className="text-center text-gray-400 py-12">現在ご案内できるメニューがありません</p>
        ) : (
          <div className="space-y-3">
            {menus.map(menu => (
              <button
                key={menu.id}
                onClick={() => router.push(
                  `/staff?salonId=${salonId}&menu=${encodeURIComponent(menu.name)}&time=${encodeURIComponent(menu.time)}&price=${encodeURIComponent(menu.price)}`
                )}
                className="w-full bg-white rounded-xl p-4 shadow flex justify-between items-center cursor-pointer"
              >
                <div className="text-left">
                  <p className="font-bold">{menu.name}</p>
                  {menu.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{menu.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">{menu.time}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-blue-600 font-bold">{menu.price}</p>
                  <p className="text-gray-400 text-xs">›</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense>
      <MenuContent />
    </Suspense>
  );
}
