'use client';
import { useEffect, useState, useRef } from 'react';
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

const REGION_AREAS: Record<string, string[]> = {
  '北海道': ['北海道', '札幌'],
  '東北': ['東北', '仙台', '盛岡', '青森', '秋田', '山形', '福島'],
  '北信越': ['北信越', '長野', '新潟', '富山', '石川', '金沢', '福井'],
  '関東': ['関東', '東京', '渋谷', '新宿', '銀座', '表参道', '池袋', '原宿', '恵比寿', '六本木', '横浜', '埼玉', '千葉', '茨城', '栃木', '群馬'],
  '東海': ['東海', '名古屋', '静岡', '愛知', '岐阜', '三重'],
  '関西': ['関西', '大阪', '京都', '神戸', '梅田', '奈良', '滋賀', '和歌山'],
  '中国': ['中国', '広島', '岡山', '鳥取', '島根', '山口'],
  '四国': ['四国', '松山', '高松', '徳島', '高知'],
  '九州・沖縄': ['九州', '沖縄', '福岡', '博多', '熊本', '鹿児島', '長崎', '大分', '宮崎', '佐賀'],
};

type Region = {
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  fontSize?: number;
  lines?: string[];
};

const REGIONS: Region[] = [
  {
    name: '北海道',
    path: 'M190,15 C215,8 245,12 258,28 C263,42 255,55 238,61 C221,67 200,62 190,51 C179,40 179,27 190,15 Z',
    labelX: 224, labelY: 40,
  },
  {
    name: '東北',
    path: 'M195,64 L220,60 L228,93 L219,128 L200,135 L182,124 L180,93 Z',
    labelX: 208, labelY: 100,
  },
  {
    name: '北信越',
    path: 'M158,128 L185,122 L190,153 L174,171 L149,169 L137,151 L147,132 Z',
    labelX: 161, labelY: 150, fontSize: 7,
  },
  {
    name: '関東',
    path: 'M188,132 L218,128 L226,159 L210,176 L188,173 L177,153 Z',
    labelX: 205, labelY: 155,
  },
  {
    name: '東海',
    path: 'M174,176 L210,173 L216,201 L198,219 L169,217 L161,196 Z',
    labelX: 191, labelY: 199,
  },
  {
    name: '関西',
    path: 'M136,176 L172,172 L178,199 L161,219 L134,221 L117,206 L124,183 Z',
    labelX: 148, labelY: 201,
  },
  {
    name: '中国',
    path: 'M96,203 L137,199 L144,223 L127,243 L97,245 L79,229 L85,212 Z',
    labelX: 113, labelY: 226,
  },
  {
    name: '四国',
    path: 'M134,249 L178,244 L183,267 L162,277 L137,276 L124,261 Z',
    labelX: 155, labelY: 264,
  },
  {
    name: '九州・沖縄',
    path: 'M60,204 L94,200 L102,229 L91,263 L67,273 L43,258 L47,229 Z',
    labelX: 73, labelY: 230, fontSize: 6.5,
    lines: ['九州・', '沖縄'],
  },
];

export default function SalonListPage() {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState('');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
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
          .filter(s => (s.genres || []).includes('縮毛矯正'))
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

  const activeRegions = new Set<string>();
  salons.forEach(s => {
    for (const [region, areas] of Object.entries(REGION_AREAS)) {
      if (areas.includes(s.area)) { activeRegions.add(region); break; }
    }
  });

  const handleRegionClick = (regionName: string) => {
    setSelectedRegion(prev => prev === regionName ? null : regionName);
    setSearchText('');
    setTimeout(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const filtered = salons.filter(s => {
    const regionMatch = !selectedRegion || (REGION_AREAS[selectedRegion] || []).includes(s.area);
    const textMatch = !searchText || s.name.includes(searchText) || (s.address || '').includes(searchText);
    return regionMatch && textMatch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="bg-main text-gray-800 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">メンズ縮毛矯正</h1>
            <p className="text-xs text-gray-600 mt-0.5">専門サロン一覧</p>
          </div>
          <span className="text-sm">{userName}さん</span>
        </div>
        <input
          type="text"
          placeholder="店舗名・エリアで検索"
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setSelectedRegion(null); }}
          className="w-full rounded-lg px-3 py-2 text-gray-900 text-sm"
        />
      </div>

      {/* エリア選択マップ */}
      <div className="bg-[#f7f0e6] p-4 border-b">
        <h2 className="text-base font-bold mb-2">
          <span className="text-accent font-extrabold">エリア</span>からサロンを探す
        </h2>
        <div className="flex gap-4 text-xs text-gray-600 mb-4">
          <span>🖥 24時間ネット予約</span>
          <span>🎁 ポイント還元</span>
          <span>💬 口コミ掲載</span>
        </div>

        <svg viewBox="0 0 300 290" className="w-full h-auto max-h-64">
          {REGIONS.map(region => {
            const hasData = activeRegions.has(region.name);
            const isSelected = selectedRegion === region.name;
            const fillColor = isSelected ? '#00838f' : hasData ? '#9e9e9e' : '#c8c8c8';
            const textColor = isSelected ? 'white' : hasData ? '#c62828' : '#999';
            const fs = region.fontSize ?? 8;

            return (
              <g key={region.name} onClick={() => handleRegionClick(region.name)} className="cursor-pointer">
                <path
                  d={region.path}
                  fill={fillColor}
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                {region.lines ? (
                  <text
                    textAnchor="middle"
                    fontSize={fs}
                    fontWeight="bold"
                    fill={textColor}
                    style={{ pointerEvents: 'none' }}
                  >
                    {region.lines.map((line, i) => (
                      <tspan key={i} x={region.labelX} y={region.labelY + i * (fs + 1.5)}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                ) : (
                  <text
                    x={region.labelX}
                    y={region.labelY}
                    textAnchor="middle"
                    fontSize={fs}
                    fontWeight="bold"
                    fill={textColor}
                    style={{ pointerEvents: 'none' }}
                  >
                    {region.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {selectedRegion && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#e8ddd0]">
            <p className="text-sm font-bold text-accent">📍 {selectedRegion}のサロン</p>
            <button
              onClick={() => setSelectedRegion(null)}
              className="text-xs text-gray-500 underline cursor-pointer"
            >
              選択解除
            </button>
          </div>
        )}
      </div>

      {/* 店舗一覧 */}
      <div className="p-4" ref={listRef}>
        {loading ? (
          <p className="text-center text-gray-400 py-16">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-4xl mb-4">✂</p>
            <p className="text-gray-500">
              {selectedRegion
                ? `${selectedRegion}エリアの店舗は現在準備中です`
                : searchText
                ? '条件に合う店舗が見つかりません'
                : '現在ご案内できる店舗がありません'}
            </p>
            <button
              onClick={() => { setSelectedRegion(null); setSearchText(''); }}
              className="mt-4 text-accent text-sm underline cursor-pointer"
            >
              条件をリセット
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {selectedRegion ? `${selectedRegion} · ` : ''}{filtered.length}件の店舗
            </p>
            {filtered.map(salon => (
              <div key={salon.id} className="bg-white rounded-xl shadow overflow-hidden">
                {salon.imageUrl ? (
                  <img src={salon.imageUrl} alt={salon.name} className="w-full h-44 object-cover" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-main to-main-light flex items-center justify-center">
                    <span className="text-accent/40 text-6xl">✂</span>
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

                  {salon.area && (
                    <div className="mt-2">
                      <span className="text-xs bg-main text-gray-700 px-2 py-1 rounded-full font-bold">
                        {salon.area}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 space-y-0.5">
                    {salon.address && <p className="text-xs text-gray-500">📍 {salon.address}</p>}
                    {salon.openHours && <p className="text-xs text-gray-500">🕐 {salon.openHours}</p>}
                    {salon.closedDays && <p className="text-xs text-gray-500">🗓 定休日: {salon.closedDays}</p>}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => router.push(`/salon/${salon.id}`)}
                      className="flex-1 border border-accent text-accent rounded-xl py-2.5 font-bold text-sm cursor-pointer"
                    >
                      詳細を見る
                    </button>
                    <button
                      onClick={() => router.push(`/menu?salonId=${salon.id}`)}
                      className="flex-1 bg-accent text-white rounded-xl py-2.5 font-bold text-sm cursor-pointer"
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
            className="w-full border border-accent text-accent rounded-xl p-4 font-bold cursor-pointer"
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
