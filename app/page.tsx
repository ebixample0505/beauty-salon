'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import liff from '@line/liff';

type Salon = {
  id: string;
  name: string;
  catchCopy: string;
  address: string;
  area: string;
  genres: string[];
  imageUrl: string;
  rating: number;
  reviewCount: number;
  openHours: string;
  closedDays: string;
  isActive: boolean;
  order: number;
};

const AREAS = ['すべて', '渋谷', '新宿', '銀座', '表参道', '池袋', '原宿', '恵比寿', '六本木'];
const GENRES = ['すべて', 'カット', 'カラー', 'パーマ', 'トリートメント', 'ヘッドスパ', '縮毛矯正'];

export default function SalonListPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState('すべて');
  const [selectedGenre, setSelectedGenre] = useState('すべて');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        if (!isLocalhost) {
          await liff.init({ liffId: '2010454791-miMuAYxd' });
          if (!liff.isLoggedIn()) { liff.login(); return; }
          const profile = await liff.getProfile();
          setUserName(profile.displayName);
        } else {
          setUserName('テストユーザー');
        }
      } catch {
        setUserName('ゲスト');
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const q = query(collection(db, 'salons'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Salon)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setSalons(data);
      } catch (e) {
        console.error('店舗取得エラー:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSalons();
  }, []);

  const filtered = salons.filter(s => {
    const areaMatch = selectedArea === 'すべて' || s.area === selectedArea;
    const genreMatch = selectedGenre === 'すべて' || (s.genres || []).includes(selectedGenre);
    const textMatch = !searchText || s.name.includes(searchText) || (s.address || '').includes(searchText);
    return areaMatch && genreMatch && textMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">BeautySalon</h1>
          <span className="text-sm">{userName}さん</span>
        </div>
        <input
          type="text"
          placeholder="店舗名・エリアで検索"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-gray-900 text-sm"
        />
      </div>

      {/* エリアフィルター */}
      <div className="bg-white border-b px-2 pt-2 pb-1">
        <p className="text-xs text-gray-500 px-2 mb-1 font-bold">エリア</p>
        <div className="flex gap-2 overflow-x-auto pb-2 px-1">
          {AREAS.map(area => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold border cursor-pointer transition-colors ${
                selectedArea === area
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* ジャンルフィルター */}
      <div className="bg-white border-b px-2 pt-2 pb-1">
        <p className="text-xs text-gray-500 px-2 mb-1 font-bold">ジャンル</p>
        <div className="flex gap-2 overflow-x-auto pb-2 px-1">
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-bold border cursor-pointer transition-colors ${
                selectedGenre === genre
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* 店舗一覧 */}
      <div className="p-4">
        {loading ? (
          <p className="text-center text-gray-400 py-16">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-4xl mb-4">✂</p>
            <p className="text-gray-500">条件に合う店舗が見つかりません</p>
            <button
              onClick={() => { setSelectedArea('すべて'); setSelectedGenre('すべて'); setSearchText(''); }}
              className="mt-4 text-blue-600 text-sm underline cursor-pointer"
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">{filtered.length}件の店舗</p>
            {filtered.map(salon => (
              <div key={salon.id} className="bg-white rounded-xl shadow overflow-hidden">
                {salon.imageUrl ? (
                  <img src={salon.imageUrl} alt={salon.name} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                    <span className="text-blue-300 text-6xl">✂</span>
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-lg">{salon.name}</h2>
                      {salon.catchCopy && (
                        <p className="text-sm text-gray-500 mt-0.5">{salon.catchCopy}</p>
                      )}
                    </div>
                    {salon.rating > 0 && (
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-yellow-500 font-bold text-sm">★ {salon.rating.toFixed(1)}</p>
                        {salon.reviewCount > 0 && (
                          <p className="text-xs text-gray-400">({salon.reviewCount}件)</p>
                        )}
                      </div>
                    )}
                  </div>

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

                  <div className="mt-2 space-y-0.5">
                    {salon.address && (
                      <p className="text-xs text-gray-500">📍 {salon.address}</p>
                    )}
                    {salon.openHours && (
                      <p className="text-xs text-gray-500">🕐 {salon.openHours}</p>
                    )}
                    {salon.closedDays && (
                      <p className="text-xs text-gray-500">🗓 定休日: {salon.closedDays}</p>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/salon/${salon.id}`)}
                      className="flex-1 border border-blue-600 text-blue-600 rounded-xl py-2.5 font-bold text-sm cursor-pointer"
                    >
                      詳細を見る
                    </button>
                    <button
                      onClick={() => router.push(`/menu?salonId=${salon.id}`)}
                      className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 font-bold text-sm cursor-pointer"
                    >
                      予約する
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-3">
          <button
            onClick={() => router.push('/mypage')}
            className="w-full border border-blue-600 text-blue-600 rounded-xl p-4 font-bold cursor-pointer"
          >
            予約確認・キャンセル
          </button>
          <button
            onClick={() => router.push('/coupon')}
            className="w-full bg-yellow-400 text-white rounded-xl p-4 font-bold cursor-pointer"
          >
            クーポンを見る
          </button>
        </div>
      </div>
    </div>
  );
}
