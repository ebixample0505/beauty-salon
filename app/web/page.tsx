import type { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// このページを毎回サーバー側で動的に生成し、Firestoreの最新データを反映させる
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'test美容室 | WEB予約',
  description:
    'test美容室のWEB予約ページです。カット・カラー・パーマなど各種メニューをオンラインで簡単にご予約いただけます。',
};

type Menu = {
  id: string;
  name: string;
  time: string;
  price: string;
  description?: string;
  isActive: boolean;
  order: number;
};

async function getMenus(): Promise<Menu[]> {
  try {
    const q = query(collection(db, 'menus'), where('isActive', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }) as Menu)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (e) {
    console.error('メニュー取得エラー:', e);
    return [];
  }
}

export default async function WebHomePage() {
  const menus = await getMenus();

  return (
    <div>
      <div className="bg-blue-600 text-white p-6">
        <h1 className="text-xl font-bold">test美容室 WEB予約</h1>
        <p className="text-sm mt-1 text-blue-100">24時間いつでもご予約いただけます</p>
      </div>

      <div className="p-4">
        <h2 className="text-lg font-bold mb-4">メニューを選択してください</h2>

        {menus.length === 0 ? (
          <p className="text-center text-gray-400 py-12">現在ご案内できるメニューがありません</p>
        ) : (
          <div className="space-y-3">
            {menus.map(menu => (
              <a
                key={menu.id}
                href={`/web/staff?menu=${encodeURIComponent(menu.name)}&time=${encodeURIComponent(menu.time)}&price=${encodeURIComponent(menu.price)}`}
                className="block bg-white rounded-xl p-4 shadow flex justify-between items-center"
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
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}