'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

type Salon = {
  id: string;
  name: string;
  catchCopy: string;
  description: string;
  address: string;
  area: string;
  genres: string[];
  imageUrl: string;
  images: string[];
  rating: number;
  reviewCount: number;
  openHours: string;
  closedDays: string;
  phone: string;
};

type Staff = {
  id: string;
  name: string;
  photoUrl: string;
  title: string;
  bio: string;
  isActive: boolean;
  order: number;
};

type Menu = {
  id: string;
  name: string;
  time: string;
  price: string;
  description: string;
  isActive: boolean;
  order: number;
};

export default function SalonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const salonId = params.salonId as string;

  const [salon, setSalon] = useState<Salon | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'menu' | 'staff'>('info');

  useEffect(() => {
    if (!salonId) return;
    const fetchData = async () => {
      try {
        const [salonSnap, staffSnap, menuSnap] = await Promise.all([
          getDoc(doc(db, 'salons', salonId)),
          getDocs(query(collection(db, 'salons', salonId, 'staff'), where('isActive', '==', true))),
          getDocs(query(collection(db, 'salons', salonId, 'menus'), where('isActive', '==', true))),
        ]);

        if (salonSnap.exists()) {
          setSalon({ id: salonSnap.id, ...salonSnap.data() } as Salon);
        }

        const staffData = staffSnap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Staff)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setStaffList(staffData);

        const menuData = menuSnap.docs
          .map(d => ({ id: d.id, ...d.data() }) as Menu)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setMenus(menuData);
      } catch (e) {
        console.error('データ取得エラー:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [salonId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  );

  if (!salon) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-gray-500">店舗が見つかりません</p>
      <button onClick={() => router.push('/')} className="text-blue-600 underline cursor-pointer">
        店舗一覧へ戻る
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー画像 */}
      {salon.imageUrl ? (
        <div className="relative">
          <img src={salon.imageUrl} alt={salon.name} className="w-full h-56 object-cover" />
          <button
            onClick={() => router.push('/')}
            className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-full px-3 py-1.5 text-sm font-bold shadow cursor-pointer"
          >
            ← 戻る
          </button>
        </div>
      ) : (
        <div className="bg-blue-600 text-white p-6 relative">
          <button onClick={() => router.push('/')} className="text-sm mb-3 cursor-pointer opacity-80">
            ← 店舗一覧
          </button>
        </div>
      )}

      {/* 店舗基本情報 */}
      <div className="bg-white p-4 shadow-sm">
        {!salon.imageUrl && (
          <button onClick={() => router.push('/')} className="text-sm text-blue-600 mb-2 cursor-pointer block">
            ← 店舗一覧
          </button>
        )}
        <h1 className="text-2xl font-bold">{salon.name}</h1>
        {salon.catchCopy && <p className="text-gray-500 mt-1">{salon.catchCopy}</p>}

        <div className="flex flex-wrap gap-1 mt-2">
          {salon.area && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">
              {salon.area}
            </span>
          )}
          {(salon.genres || []).map(g => (
            <span key={g} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {g}
            </span>
          ))}
        </div>

        {salon.rating > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-yellow-500 font-bold">★ {salon.rating.toFixed(1)}</span>
            {salon.reviewCount > 0 && (
              <span className="text-sm text-gray-400">({salon.reviewCount}件のクチコミ)</span>
            )}
          </div>
        )}
      </div>

      {/* タブ */}
      <div className="flex bg-white border-b sticky top-0 z-10">
        {(['info', 'menu', 'staff'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold cursor-pointer border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            {tab === 'info' ? '店舗情報' : tab === 'menu' ? 'メニュー' : 'スタイリスト'}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* 店舗情報タブ */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {salon.description && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h2 className="font-bold mb-2">サロンについて</h2>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{salon.description}</p>
              </div>
            )}
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
              <h2 className="font-bold mb-2">アクセス・営業情報</h2>
              {salon.address && (
                <div className="flex gap-3 text-sm">
                  <span className="text-gray-400 shrink-0">住所</span>
                  <span className="text-gray-700">{salon.address}</span>
                </div>
              )}
              {salon.openHours && (
                <div className="flex gap-3 text-sm">
                  <span className="text-gray-400 shrink-0">営業時間</span>
                  <span className="text-gray-700">{salon.openHours}</span>
                </div>
              )}
              {salon.closedDays && (
                <div className="flex gap-3 text-sm">
                  <span className="text-gray-400 shrink-0">定休日</span>
                  <span className="text-gray-700">{salon.closedDays}</span>
                </div>
              )}
              {salon.phone && (
                <div className="flex gap-3 text-sm">
                  <span className="text-gray-400 shrink-0">電話</span>
                  <a href={`tel:${salon.phone}`} className="text-blue-600">{salon.phone}</a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* メニュータブ */}
        {activeTab === 'menu' && (
          <div className="space-y-3">
            {menus.length === 0 ? (
              <p className="text-center text-gray-400 py-12">メニューが登録されていません</p>
            ) : (
              menus.map(menu => (
                <button
                  key={menu.id}
                  onClick={() => router.push(`/menu?salonId=${salonId}`)}
                  className="w-full bg-white rounded-xl p-4 shadow-sm flex justify-between items-center cursor-pointer text-left"
                >
                  <div>
                    <p className="font-bold">{menu.name}</p>
                    {menu.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{menu.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{menu.time}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-blue-600 font-bold">{menu.price}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* スタイリストタブ */}
        {activeTab === 'staff' && (
          <div className="space-y-3">
            {staffList.length === 0 ? (
              <p className="text-center text-gray-400 py-12">スタイリストが登録されていません</p>
            ) : (
              staffList.map(staff => (
                <div key={staff.id} className="bg-white rounded-xl p-4 shadow-sm flex gap-4 items-center">
                  {staff.photoUrl ? (
                    <img src={staff.photoUrl} alt={staff.name} className="w-16 h-16 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                      未設定
                    </div>
                  )}
                  <div>
                    <p className="font-bold">{staff.name}</p>
                    {staff.title && <p className="text-xs text-gray-500">{staff.title}</p>}
                    {staff.bio && <p className="text-sm text-gray-600 mt-1">{staff.bio}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 固定予約ボタン */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
        <button
          onClick={() => router.push(`/menu?salonId=${salonId}`)}
          className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg cursor-pointer"
        >
          この店舗を予約する
        </button>
      </div>
    </div>
  );
}
