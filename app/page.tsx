'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import liff from '@line/liff';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';

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

type RegionInfo = {
  name: string;
  prefs: string[];
  areas: string[];
  lat: number;
  lng: number;
};

const REGIONS: RegionInfo[] = [
  {
    name: '北海道',
    prefs: ['北海道'],
    areas: ['北海道', '札幌'],
    lat: 43.5, lng: 142.5,
  },
  {
    name: '東北',
    prefs: ['青森', '岩手', '宮城', '秋田', '山形', '福島'],
    areas: ['東北', '仙台', '青森', '秋田', '盛岡', '山形', '福島', '宮城', '岩手'],
    lat: 39.2, lng: 140.8,
  },
  {
    name: '関東',
    prefs: ['東京', '神奈川', '埼玉', '千葉', '茨城', '栃木', '群馬'],
    areas: ['関東', '東京', '渋谷', '新宿', '銀座', '表参道', '池袋', '原宿', '恵比寿', '六本木', '横浜', '埼玉', '千葉', '茨城', '栃木', '群馬', '神奈川'],
    lat: 36.0, lng: 139.8,
  },
  {
    name: '北信越',
    prefs: ['新潟', '富山', '石川', '福井', '山梨', '長野'],
    areas: ['北信越', '長野', '新潟', '富山', '石川', '金沢', '福井', '山梨'],
    lat: 37.2, lng: 137.5,
  },
  {
    name: '東海',
    prefs: ['愛知', '静岡', '岐阜', '三重'],
    areas: ['東海', '名古屋', '静岡', '愛知', '岐阜', '三重'],
    lat: 35.0, lng: 137.2,
  },
  {
    name: '関西',
    prefs: ['大阪', '兵庫', '京都', '滋賀', '奈良', '和歌山'],
    areas: ['関西', '大阪', '京都', '神戸', '梅田', '奈良', '滋賀', '和歌山', '兵庫'],
    lat: 34.7, lng: 135.5,
  },
  {
    name: '中国',
    prefs: ['広島', '岡山', '鳥取', '島根', '山口'],
    areas: ['中国', '広島', '岡山', '鳥取', '島根', '山口'],
    lat: 34.7, lng: 133.0,
  },
  {
    name: '四国',
    prefs: ['徳島', '香川', '愛媛', '高知'],
    areas: ['四国', '松山', '高松', '徳島', '高知', '愛媛', '香川'],
    lat: 33.6, lng: 133.5,
  },
  {
    name: '九州・沖縄',
    prefs: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'],
    areas: ['九州', '沖縄', '福岡', '博多', '熊本', '鹿児島', '長崎', '大分', '宮崎', '佐賀'],
    lat: 33.0, lng: 130.5,
  },
];

const GEO_URL = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson';

const PREF_TO_REGION: Record<string, string> = {
  '北海道': '北海道',
  '青森県': '東北', '岩手県': '東北', '宮城県': '東北', '秋田県': '東北', '山形県': '東北', '福島県': '東北',
  '茨城県': '関東', '栃木県': '関東', '群馬県': '関東', '埼玉県': '関東', '千葉県': '関東', '東京都': '関東', '神奈川県': '関東',
  '新潟県': '北信越', '富山県': '北信越', '石川県': '北信越', '福井県': '北信越', '山梨県': '北信越', '長野県': '北信越',
  '岐阜県': '東海', '静岡県': '東海', '愛知県': '東海', '三重県': '東海',
  '滋賀県': '関西', '京都府': '関西', '大阪府': '関西', '兵庫県': '関西', '奈良県': '関西', '和歌山県': '関西',
  '鳥取県': '中国', '島根県': '中国', '岡山県': '中国', '広島県': '中国', '山口県': '中国',
  '徳島県': '四国', '香川県': '四国', '愛媛県': '四国', '高知県': '四国',
  '福岡県': '九州・沖縄', '佐賀県': '九州・沖縄', '長崎県': '九州・沖縄', '熊本県': '九州・沖縄',
  '大分県': '九州・沖縄', '宮崎県': '九州・沖縄', '鹿児島県': '九州・沖縄', '沖縄県': '九州・沖縄',
};

function JapanMap({
  selected, active, onRegionClick,
}: {
  selected: string | null;
  active: Set<string>;
  onRegionClick: (name: string) => void;
}) {
  return (
    <div style={{ width: '160px', margin: '0 auto' }}>
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ scale: 1700, center: [137, 37] }}
      width={300}
      height={320}
    >
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map(geo => {
            const prefName: string = (geo.properties?.nam_ja as string) || '';
            const regionName = PREF_TO_REGION[prefName];
            const isSelected = selected === regionName;
            const hasData = regionName ? active.has(regionName) : false;
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={isSelected ? '#00838f' : hasData ? '#80cbc4' : '#bdbdbd'}
                stroke="#fff"
                strokeWidth={0.5}
                onClick={() => regionName && hasData && onRegionClick(regionName)}
              />
            );
          })
        }
      </Geographies>
      {REGIONS.map(r => {
        const isSelected = selected === r.name;
        const hasData = active.has(r.name);
        return (
          <Marker key={r.name} coordinates={[r.lng, r.lat]}>
            <text
              textAnchor="middle"
              style={{
                fontSize: r.name === '九州・沖縄' ? '5.5px' : '7px',
                fontWeight: 'bold',
                fill: isSelected ? '#fff' : hasData ? '#b71c1c' : '#757575',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {r.name}
            </text>
          </Marker>
        );
      })}
    </ComposableMap>
    </div>
  );
}

export default function SalonListPage() {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState('');
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedPref, setSelectedPref] = useState<string | null>(null);
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
      } catch { setUserName('ゲスト'); }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchSalons = async () => {
      try {
        const q = query(collection(db, 'salons'), where('isActive', '==', true));
        const snap = await getDocs(q);
        const data = snap.docs
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
    REGIONS.forEach(r => { if (r.areas.includes(s.area)) activeRegions.add(r.name); });
  });

  const handleRegionClick = (name: string) => {
    if (selectedRegion === name) {
      setSelectedRegion(null);
      setSelectedPref(null);
    } else {
      setSelectedRegion(name);
      setSelectedPref(null);
    }
    setSearchText('');
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const handlePrefClick = (pref: string, regionName: string) => {
    setSelectedRegion(regionName);
    setSelectedPref(prev => prev === pref ? null : pref);
    setSearchText('');
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const filtered = salons.filter(s => {
    let areaMatch = true;
    if (selectedPref) {
      const region = REGIONS.find(r => r.prefs.includes(selectedPref));
      areaMatch = (region?.areas ?? []).some(a => (s.area || '').includes(a)) ||
                  (s.address || '').includes(selectedPref);
    } else if (selectedRegion) {
      const r = REGIONS.find(reg => reg.name === selectedRegion);
      areaMatch = (r?.areas ?? []).includes(s.area);
    }
    const textMatch = !searchText || s.name.includes(searchText) || (s.address || '').includes(searchText);
    return areaMatch && textMatch;
  });

  const currentRegion = REGIONS.find(r => r.name === selectedRegion);

  return (
    <div className="min-h-screen bg-white">
      {/* 固定ヘッダー */}
      <div className="bg-main text-gray-800 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">メンズ縮毛矯正</h1>
            <p className="text-xs text-gray-600 mt-0.5">専門サロン一覧</p>
          </div>
          <span className="text-sm">{userName}さん</span>
        </div>
      </div>

      {/* エリア選択セクション */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-xl font-bold mb-3">エリアからヘアサロンを探す</h2>

        {/* 地図 */}
        <JapanMap
          selected={selectedRegion}
          active={activeRegions}
          onRegionClick={handleRegionClick}
        />

        {/* 地域ボタン（地図の下・共通） */}
        <div className="flex flex-wrap gap-1 mt-2">
          {REGIONS.map(r => (
            <button
              key={r.name}
              onClick={() => activeRegions.has(r.name) && handleRegionClick(r.name)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight transition-colors border ${
                selectedRegion === r.name
                  ? 'bg-accent text-white border-accent'
                  : activeRegions.has(r.name)
                  ? 'border-accent/50 text-accent bg-accent/5 hover:bg-accent/15 cursor-pointer'
                  : 'border-gray-200 text-gray-400 cursor-default'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        {/* 都道府県ボタン（地域選択後に表示） */}
        {selectedRegion && currentRegion && (
          <div className="mt-1.5">
            <div className="flex flex-wrap gap-0.5 items-center">
              {currentRegion.prefs.map(p => (
                <button
                  key={p}
                  onClick={() => handlePrefClick(p, selectedRegion)}
                  className={`rounded px-1.5 py-px text-[10px] font-medium border transition-colors cursor-pointer ${
                    selectedPref === p
                      ? 'bg-accent text-white border-accent'
                      : 'border-gray-300 text-gray-600 hover:border-accent hover:text-accent'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => { setSelectedRegion(null); setSelectedPref(null); }}
                className="ml-1 text-[9px] text-gray-400 underline cursor-pointer"
              >
                解除
              </button>
            </div>
          </div>
        )}

        {/* 検索バー */}
        <div className="mt-4">
          <p className="text-sm font-bold text-gray-700 mb-2">検索して探す</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="サロン名、エリア名で探す"
              value={searchText}
              onChange={e => { setSearchText(e.target.value); setSelectedRegion(null); setSelectedPref(null); }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button className="bg-accent text-white px-4 rounded-lg font-bold text-lg cursor-pointer">
              🔍
            </button>
          </div>
        </div>
      </div>

      {/* 店舗一覧 */}
      <div className="p-4" ref={listRef}>
        {loading ? (
          <p className="text-center text-gray-400 py-16">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-4xl mb-4">✂</p>
            <p className="text-gray-500">
              {selectedPref
                ? `${selectedPref}の店舗は現在準備中です`
                : selectedRegion
                ? `${selectedRegion}エリアの店舗は現在準備中です`
                : searchText
                ? '条件に合う店舗が見つかりません'
                : '現在ご案内できる店舗がありません'}
            </p>
            <button
              onClick={() => { setSelectedRegion(null); setSelectedPref(null); setSearchText(''); }}
              className="mt-4 text-accent text-sm underline cursor-pointer"
            >
              条件をリセット
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {selectedPref ? `${selectedPref} · ` : selectedRegion ? `${selectedRegion} · ` : ''}{filtered.length}件の店舗
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
                      <span className="text-xs bg-main text-gray-700 px-2 py-1 rounded-full font-bold">{salon.area}</span>
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
          <button onClick={() => router.push('/mypage')} className="w-full border border-accent text-accent rounded-xl p-4 font-bold cursor-pointer">
            予約確認・キャンセル
          </button>
          <button onClick={() => router.push('/coupon')} className="w-full bg-yellow-400 text-white rounded-xl p-4 font-bold cursor-pointer">
            クーポンを見る
          </button>
        </div>
      </div>
    </div>
  );
}
