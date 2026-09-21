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

type RegionInfo = {
  name: string;
  prefs: string[];
  areas: string[];
  path: string;
  lx: number;
  ly: number;
  fs?: number;
};

const REGIONS: RegionInfo[] = [
  {
    name: '北海道', prefs: ['北海道'],
    areas: ['北海道', '札幌'],
    path: 'M190,15 C215,8 245,12 258,28 C263,42 255,55 238,61 C221,67 200,62 190,51 C179,40 179,27 190,15 Z',
    lx: 224, ly: 40,
  },
  {
    name: '東北', prefs: ['青森', '秋田', '岩手', '山形', '宮城', '福島'],
    areas: ['東北', '仙台', '青森', '秋田', '盛岡', '山形', '福島', '宮城', '岩手'],
    path: 'M195,64 L220,60 L228,93 L219,128 L200,135 L182,124 L180,93 Z',
    lx: 208, ly: 100,
  },
  {
    name: '北信越', prefs: ['富山', '新潟', '石川', '長野', '福井', '山梨'],
    areas: ['北信越', '長野', '新潟', '富山', '石川', '金沢', '福井', '山梨'],
    path: 'M158,128 L185,122 L190,153 L174,171 L149,169 L137,151 L147,132 Z',
    lx: 161, ly: 150, fs: 7,
  },
  {
    name: '関東', prefs: ['東京', '茨城', '神奈川', '栃木', '千葉', '群馬', '埼玉'],
    areas: ['関東', '東京', '渋谷', '新宿', '銀座', '表参道', '池袋', '原宿', '恵比寿', '六本木', '横浜', '埼玉', '千葉', '茨城', '栃木', '群馬', '神奈川'],
    path: 'M188,132 L218,128 L226,159 L210,176 L188,173 L177,153 Z',
    lx: 205, ly: 155,
  },
  {
    name: '東海', prefs: ['愛知', '静岡', '岐阜', '三重'],
    areas: ['東海', '名古屋', '静岡', '愛知', '岐阜', '三重'],
    path: 'M174,176 L210,173 L216,201 L198,219 L169,217 L161,196 Z',
    lx: 191, ly: 199,
  },
  {
    name: '関西', prefs: ['京都', '大阪', '奈良', '滋賀', '兵庫', '和歌山'],
    areas: ['関西', '大阪', '京都', '神戸', '梅田', '奈良', '滋賀', '和歌山', '兵庫'],
    path: 'M136,176 L172,172 L178,199 L161,219 L134,221 L117,206 L124,183 Z',
    lx: 148, ly: 201,
  },
  {
    name: '中国', prefs: ['広島', '鳥取', '山口', '島根', '岡山'],
    areas: ['中国', '広島', '岡山', '鳥取', '島根', '山口'],
    path: 'M96,203 L137,199 L144,223 L127,243 L97,245 L79,229 L85,212 Z',
    lx: 113, ly: 226,
  },
  {
    name: '四国', prefs: ['徳島', '愛媛', '香川', '高知'],
    areas: ['四国', '松山', '高松', '徳島', '高知', '愛媛', '香川'],
    path: 'M134,249 L178,244 L183,267 L162,277 L137,276 L124,261 Z',
    lx: 155, ly: 264,
  },
  {
    name: '九州', prefs: ['福岡', '宮崎', '佐賀', '鹿児島', '長崎', '沖縄', '熊本', '大分'],
    areas: ['九州', '沖縄', '福岡', '博多', '熊本', '鹿児島', '長崎', '大分', '宮崎', '佐賀'],
    path: 'M60,204 L94,200 L102,229 L91,263 L67,273 L43,258 L47,229 Z',
    lx: 73, ly: 235, fs: 7.5,
  },
];

const LEFT_NAMES  = ['中国', '関西', '九州'];
const RIGHT_NAMES = ['北海道', '東北', '関東'];
const TOP_NAME    = '北信越';
const BOTTOM_NAMES = ['四国', '東海'];

function RegionCard({
  region, isSelected, hasData, onSelect,
}: {
  region: RegionInfo;
  isSelected: boolean;
  hasData: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={() => hasData && onSelect()}
      className={`rounded overflow-hidden select-none transition-all ${
        hasData ? 'cursor-pointer' : 'opacity-40 cursor-default'
      } ${isSelected ? 'ring-2 ring-accent shadow-md' : ''}`}
    >
      <div className={`text-center py-1.5 text-xs font-bold text-white ${
        isSelected ? 'bg-accent' : 'bg-accent/80'
      }`}>
        {region.name}
      </div>
      <div className="grid grid-cols-2 gap-px bg-gray-200 border border-t-0 border-gray-200">
        {region.prefs.map(p => (
          <div key={p} className="bg-white text-center text-xs py-1 text-gray-700">
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}

function JapanMap({
  regions, selected, active, onRegionClick,
}: {
  regions: RegionInfo[];
  selected: string | null;
  active: Set<string>;
  onRegionClick: (name: string) => void;
}) {
  return (
    <svg viewBox="0 0 300 290" className="w-full h-auto">
      {regions.map(r => {
        const isSelected = selected === r.name;
        const hasData = active.has(r.name);
        const fill = isSelected ? '#00838f' : hasData ? '#80cbc4' : '#bdbdbd';
        const textFill = isSelected ? '#fff' : hasData ? '#004d40' : '#9e9e9e';
        const fs = r.fs ?? 8;
        return (
          <g
            key={r.name}
            onClick={() => hasData && onRegionClick(r.name)}
            className={hasData ? 'cursor-pointer' : ''}
          >
            <path d={r.path} fill={fill} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            <text
              x={r.lx} y={r.ly}
              textAnchor="middle"
              fontSize={fs}
              fontWeight="bold"
              fill={textFill}
              style={{ pointerEvents: 'none' }}
            >
              {r.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

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
    setSelectedRegion(prev => prev === name ? null : name);
    setSearchText('');
    setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  };

  const filtered = salons.filter(s => {
    const r = REGIONS.find(reg => reg.name === selectedRegion);
    const regionMatch = !selectedRegion || (r?.areas ?? []).includes(s.area);
    const textMatch = !searchText || s.name.includes(searchText) || (s.address || '').includes(searchText);
    return regionMatch && textMatch;
  });

  const findRegion = (name: string) => REGIONS.find(r => r.name === name)!;

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
        <h2 className="text-xl font-bold mb-1">サロンを探す</h2>
        <p className="text-sm text-accent mb-4">
          地域でいちばん縮毛矯正の上手なサロンを全国から集めています。<br className="hidden sm:block" />
          ショート・ボブ・ロング・メンズもなりたいスタイルを叶えます。
        </p>

        {/* ── デスクトップ: 3カラムレイアウト ── */}
        <div className="hidden sm:grid grid-cols-[148px_1fr_148px] gap-3 items-start">
          {/* 左列: 中国・関西・九州 */}
          <div className="space-y-2">
            {LEFT_NAMES.map(name => (
              <RegionCard
                key={name}
                region={findRegion(name)}
                isSelected={selectedRegion === name}
                hasData={activeRegions.has(name)}
                onSelect={() => handleRegionClick(name)}
              />
            ))}
          </div>

          {/* 中央: 北信越（上）＋地図＋四国・東海（下） */}
          <div>
            <div className="flex justify-center mb-2">
              <div className="w-36">
                <RegionCard
                  region={findRegion(TOP_NAME)}
                  isSelected={selectedRegion === TOP_NAME}
                  hasData={activeRegions.has(TOP_NAME)}
                  onSelect={() => handleRegionClick(TOP_NAME)}
                />
              </div>
            </div>
            <JapanMap
              regions={REGIONS}
              selected={selectedRegion}
              active={activeRegions}
              onRegionClick={handleRegionClick}
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              {BOTTOM_NAMES.map(name => (
                <RegionCard
                  key={name}
                  region={findRegion(name)}
                  isSelected={selectedRegion === name}
                  hasData={activeRegions.has(name)}
                  onSelect={() => handleRegionClick(name)}
                />
              ))}
            </div>
          </div>

          {/* 右列: 北海道・東北・関東 */}
          <div className="space-y-2">
            {RIGHT_NAMES.map(name => (
              <RegionCard
                key={name}
                region={findRegion(name)}
                isSelected={selectedRegion === name}
                hasData={activeRegions.has(name)}
                onSelect={() => handleRegionClick(name)}
              />
            ))}
          </div>
        </div>

        {/* ── モバイル: 地図＋3×3エリアボタン ── */}
        <div className="sm:hidden">
          <JapanMap
            regions={REGIONS}
            selected={selectedRegion}
            active={activeRegions}
            onRegionClick={handleRegionClick}
          />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {REGIONS.map(r => (
              <button
                key={r.name}
                onClick={() => activeRegions.has(r.name) && handleRegionClick(r.name)}
                className={`rounded-lg py-2 px-1 text-xs font-bold text-center transition-colors ${
                  selectedRegion === r.name
                    ? 'bg-accent text-white'
                    : activeRegions.has(r.name)
                    ? 'bg-accent/15 text-accent'
                    : 'bg-gray-100 text-gray-400 cursor-default'
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        {/* 選択中エリア表示 */}
        {selectedRegion && (
          <div className="flex items-center justify-between mt-3 px-3 py-2 bg-main-light rounded-lg">
            <p className="text-sm font-bold text-accent">📍 {selectedRegion}</p>
            <button
              onClick={() => setSelectedRegion(null)}
              className="text-xs text-gray-500 underline cursor-pointer"
            >
              解除
            </button>
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
              onChange={e => { setSearchText(e.target.value); setSelectedRegion(null); }}
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
