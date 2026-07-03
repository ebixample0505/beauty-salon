'use client';
import { useState, useEffect } from 'react';

type MenuItem = {
  label: string;
  url: string;
};

export default function AdminRichMenuPage() {
  const [tabALabel, setTabALabel] = useState('メインメニュー');
  const [tabBLabel, setTabBLabel] = useState('お得情報');
  const [tabAItems, setTabAItems] = useState<MenuItem[]>([
    { label: '予約する', url: 'https://miniapp.line.me/2010454791-miMuAYxd' },
    { label: 'クーポン', url: 'https://miniapp.line.me/2010454791-miMuAYxd/coupon' },
    { label: 'お得情報へ', url: '' }, // ボタン3はタブ切り替え（urlは使わない）
  ]);
  const [tabBItems, setTabBItems] = useState<MenuItem[]>([
    { label: 'キャンペーン', url: 'https://miniapp.line.me/2010454791-miMuAYxd' },
    { label: 'SNS', url: 'https://miniapp.line.me/2010454791-miMuAYxd' },
    { label: 'メインメニューへ', url: '' }, // ボタン3はタブ切り替え（urlは使わない）
  ]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tabAId, setTabAId] = useState('');
  const [tabBId, setTabBId] = useState('');
  const [tabAImage, setTabAImage] = useState<File | null>(null);
  const [tabBImage, setTabBImage] = useState<File | null>(null);
  const [uploadMessageA, setUploadMessageA] = useState('');
  const [uploadMessageB, setUploadMessageB] = useState('');
  const [activePreview, setActivePreview] = useState<'A' | 'B'>('A');

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    if (!isAuthenticated) {
      window.location.href = '/admin/login';
    }
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setMessage('');
    setTabAId('');
    setTabBId('');
    setUploadMessageA('');
    setUploadMessageB('');
    try {
      const res = await fetch('/api/richmenu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabAItems, tabBItems, tabALabel, tabBLabel }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('2つのリッチメニューを作成しました！タブAの画像をアップロードしてください。');
        setTabAId(data.tabAId);
        setTabBId(data.tabBId);
      } else {
        setMessage(`エラー: ${data.error}`);
      }
    } catch {
      setMessage('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (richMenuId: string, imageFile: File, tab: 'A' | 'B') => {
    if (!imageFile || !richMenuId) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('richMenuId', richMenuId);
      formData.append('isDefault', tab === 'A' ? 'true' : 'false');
      formData.append('tabAId', tabAId);
      formData.append('tabBId', tabBId);
      formData.append('isLastUpload', tab === 'B' ? 'true' : 'false');

      const res = await fetch('/api/richmenu', {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (tab === 'A') {
          setUploadMessageA('タブAの画像をアップロードしました！次にタブBの画像をアップロードしてください。');
        } else {
          setUploadMessageB('完了！LINEアプリを再起動して確認してください。');
        }
      } else {
        if (tab === 'A') setUploadMessageA(`エラー: ${data.error}`);
        else setUploadMessageB(`エラー: ${data.error}`);
      }
    } catch {
      if (tab === 'A') setUploadMessageA('エラーが発生しました');
      else setUploadMessageB('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];

  const updateItem = (tab: 'A' | 'B', index: number, field: 'label' | 'url', value: string) => {
    if (tab === 'A') {
      const newItems = [...tabAItems];
      newItems[index] = { ...newItems[index], [field]: value };
      setTabAItems(newItems);
    } else {
      const newItems = [...tabBItems];
      newItems[index] = { ...newItems[index], [field]: value };
      setTabBItems(newItems);
    }
  };

  const renderButtons = (tab: 'A' | 'B') => {
    const items = tab === 'A' ? tabAItems : tabBItems;
    const switchLabel = tab === 'A' ? tabBLabel : tabALabel;

    return items.map((item, i) => {
      const isSwitch = i === 2;
      return (
        <div key={i} className="border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`inline-block ${colors[i]} text-white text-xs font-bold px-2 py-1 rounded-full`}>
              ボタン{i + 1}
            </div>
            {isSwitch && (
              <div className="inline-block bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                タブ切り替え
              </div>
            )}
          </div>
          <input
            type="text"
            value={item.label}
            onChange={e => updateItem(tab, i, 'label', e.target.value)}
            placeholder="ラベル"
            className="w-full border rounded-lg p-2 mb-2 text-sm"
          />
          {isSwitch ? (
            <div className="w-full border rounded-lg p-2 text-sm bg-orange-50 text-orange-600 font-bold text-center">
              → 「{switchLabel}」タブへ切り替え（自動設定）
            </div>
          ) : (
            <input
              type="text"
              value={item.url}
              onChange={e => updateItem(tab, i, 'url', e.target.value)}
              placeholder="リンクURL"
              className="w-full border rounded-lg p-2 text-sm"
            />
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white p-4">
        <button
          onClick={() => window.location.href = '/admin'}
          className="text-sm text-gray-400 mb-2"
        >
          &lt;- 管理画面に戻る
        </button>
        <h1 className="text-lg font-bold">リッチメニュー管理</h1>
        <p className="text-xs text-gray-400 mt-1">2タブ・3分割レイアウト（ボタン3でタブ切り替え）</p>
      </div>

      {/* プレビュー */}
      <div className="m-4 bg-white rounded-xl shadow p-4">
        <h2 className="font-bold mb-3">プレビュー</h2>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActivePreview('A')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold ${
              activePreview === 'A' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tabALabel}
          </button>
          <button
            onClick={() => setActivePreview('B')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold ${
              activePreview === 'B' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tabBLabel}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden border">
          {(activePreview === 'A' ? tabAItems : tabBItems).map((item, i) => (
            <div
              key={i}
              className={`${i === 2 ? 'bg-orange-400' : colors[i]} text-white p-4 text-center text-sm font-bold min-h-16 flex flex-col items-center justify-center gap-1`}
            >
              <span>{item.label}</span>
              {i === 2 && <span className="text-xs opacity-80">⇄ タブ切替</span>}
            </div>
          ))}
        </div>
      </div>

      {/* タブA設定 */}
      <div className="m-4 bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">タブA</div>
          <input
            type="text"
            value={tabALabel}
            onChange={e => setTabALabel(e.target.value)}
            className="flex-1 border rounded-lg p-2 text-sm font-bold"
            placeholder="タブ名"
          />
        </div>
        <div className="space-y-3">
          {renderButtons('A')}
        </div>
      </div>

      {/* タブB設定 */}
      <div className="m-4 bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">タブB</div>
          <input
            type="text"
            value={tabBLabel}
            onChange={e => setTabBLabel(e.target.value)}
            className="flex-1 border rounded-lg p-2 text-sm font-bold"
            placeholder="タブ名"
          />
        </div>
        <div className="space-y-3">
          {renderButtons('B')}
        </div>
      </div>

      {/* メッセージ */}
      {message && (
        <div className={`mx-4 p-3 rounded-xl text-sm font-bold text-center ${
          message.includes('エラー') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
        }`}>
          {message}
        </div>
      )}

      {/* 作成ボタン */}
      <div className="m-4">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg disabled:opacity-50"
        >
          {loading ? '処理中...' : 'LINEにリッチメニューを反映する'}
        </button>
      </div>

      {/* 画像アップロード */}
      {tabAId && tabBId && (
        <div className="space-y-4 mx-4 mb-8">

          {/* タブA画像 */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">タブA</div>
              <h2 className="font-bold">背景画像をアップロード</h2>
            </div>
            <p className="text-xs text-gray-500 mb-1">PNG/JPEG・2500×1686px推奨</p>
            <p className="text-xs text-gray-400 mb-3">ID: {tabAId}</p>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => setTabAImage(e.target.files?.[0] || null)}
              className="w-full border rounded-lg p-2 mb-2 text-sm"
            />
            {uploadMessageA && (
              <p className={`text-sm font-bold text-center mb-2 ${
                uploadMessageA.includes('エラー') ? 'text-red-500' : 'text-green-600'
              }`}>
                {uploadMessageA}
              </p>
            )}
            <button
              onClick={() => tabAImage && handleImageUpload(tabAId, tabAImage, 'A')}
              disabled={loading || !tabAImage}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold disabled:opacity-50"
            >
              {loading ? 'アップロード中...' : 'タブAの画像をアップロード'}
            </button>
          </div>

          {/* タブB画像 */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">タブB</div>
              <h2 className="font-bold">背景画像をアップロード</h2>
            </div>
            <p className="text-xs text-gray-500 mb-1">PNG/JPEG・2500×1686px推奨</p>
            <p className="text-xs text-gray-400 mb-3">ID: {tabBId}</p>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={e => setTabBImage(e.target.files?.[0] || null)}
              className="w-full border rounded-lg p-2 mb-2 text-sm"
            />
            {uploadMessageB && (
              <p className={`text-sm font-bold text-center mb-2 ${
                uploadMessageB.includes('エラー') ? 'text-red-500' : 'text-green-600'
              }`}>
                {uploadMessageB}
              </p>
            )}
            <button
              onClick={() => tabBImage && handleImageUpload(tabBId, tabBImage, 'B')}
              disabled={loading || !tabBImage}
              className="w-full bg-green-600 text-white rounded-xl py-3 font-bold disabled:opacity-50"
            >
              {loading ? 'アップロード中...' : 'タブBの画像をアップロード'}
            </button>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 rounded-xl p-4">
            <h3 className="font-bold text-yellow-800 text-sm mb-2">手順</h3>
            <p className="text-xs text-yellow-700">1. タブAの画像をアップロード</p>
            <p className="text-xs text-yellow-700">2. タブBの画像をアップロード（この時点で反映完了）</p>
            <p className="text-xs text-yellow-700">3. LINEアプリを再起動して確認</p>
            <p className="text-xs text-orange-600 font-bold mt-2">※ ボタン3をタップするとタブが切り替わります</p>
          </div>
        </div>
      )}
    </div>
  );
}