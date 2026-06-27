'use client';
import { useState, useEffect } from 'react';

type MenuItem = {
  label: string;
  url: string;
};

const defaultMenuItems: MenuItem[] = [
  { label: '予約する', url: 'https://miniapp.line.me/2010454791-miMuAYxd' },
  { label: 'クーポン', url: 'https://miniapp.line.me/2010454791-miMuAYxd/coupon' },
  { label: 'お知らせ', url: 'https://miniapp.line.me/2010454791-miMuAYxd' },
  { label: '予約確認', url: 'https://miniapp.line.me/2010454791-miMuAYxd/mypage' },
  { label: 'スタッフ紹介', url: 'https://miniapp.line.me/2010454791-miMuAYxd' },
  { label: '電話する', url: 'tel:00000000000' },
];

export default function AdminRichMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [richMenuId, setRichMenuId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    if (!isAuthenticated) {
      window.location.href = '/admin/login';
    }
  }, []);

  const handleCreate = async () => {
    setLoading(true);
    setMessage('');
    setRichMenuId('');
    setUploadMessage('');
    try {
      const res = await fetch('/api/richmenu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuItems }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('リッチメニューを作成しました！次に背景画像をアップロードしてください。');
        setRichMenuId(data.richMenuId);
      } else {
        setMessage(`エラー: ${data.error}`);
      }
    } catch (e) {
      setMessage('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !richMenuId) {
      setUploadMessage('画像とリッチメニューIDが必要です');
      return;
    }
    setLoading(true);
    setUploadMessage('');
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('richMenuId', richMenuId);

      const res = await fetch('/api/richmenu', {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage('画像のアップロードが完了しました！LINEアプリを確認してください。');
      } else {
        setUploadMessage(`エラー: ${data.error}`);
      }
    } catch (e) {
      setUploadMessage('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const positions = [
    '左上', '中央上', '右上',
    '左下', '中央下', '右下',
  ];

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
    'bg-red-500', 'bg-purple-500', 'bg-pink-500',
  ];

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
        <p className="text-xs text-gray-400 mt-1">6分割レイアウト</p>
      </div>

      {/* プレビュー */}
      <div className="m-4 bg-white rounded-xl shadow p-4">
        <h2 className="font-bold mb-3">プレビュー</h2>
        <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden border">
          {menuItems.map((item, i) => (
            <div
              key={i}
              className={`${colors[i]} text-white p-4 text-center text-sm font-bold min-h-16 flex items-center justify-center`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ボタン設定 */}
      <div className="m-4 bg-white rounded-xl shadow p-4">
        <h2 className="font-bold mb-3">ボタン設定</h2>
        <div className="space-y-4">
          {menuItems.map((item, i) => (
            <div key={i} className="border rounded-xl p-3">
              <div className={`inline-block ${colors[i]} text-white text-xs font-bold px-2 py-1 rounded-full mb-2`}>
                {positions[i]}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-bold text-gray-700">ラベル</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={e => {
                      const newItems = [...menuItems];
                      newItems[i] = { ...newItems[i], label: e.target.value };
                      setMenuItems(newItems);
                    }}
                    className="w-full border rounded-lg p-2 mt-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">リンクURL</label>
                  <input
                    type="text"
                    value={item.url}
                    onChange={e => {
                      const newItems = [...menuItems];
                      newItems[i] = { ...newItems[i], url: e.target.value };
                      setMenuItems(newItems);
                    }}
                    className="w-full border rounded-lg p-2 mt-1 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
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

      {/* リッチメニュー作成ボタン */}
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
      {richMenuId && (
        <div className="m-4 bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-2">背景画像をアップロード</h2>
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <p className="text-xs text-blue-700 font-bold">画像の作り方</p>
            <p className="text-xs text-blue-600 mt-1">
              1. Canva（無料）で新規デザインを作成
            </p>
            <p className="text-xs text-blue-600">
              2. カスタムサイズ：2500 × 1686px
            </p>
            <p className="text-xs text-blue-600">
              3. 6分割のデザインを作成
            </p>
            <p className="text-xs text-blue-600">
              4. PNG形式でダウンロード
            </p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            リッチメニューID: {richMenuId}
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={e => setImageFile(e.target.files?.[0] || null)}
            className="w-full border rounded-lg p-2 mb-3 text-sm"
          />
          {uploadMessage && (
            <p className={`text-sm font-bold text-center mb-3 ${
              uploadMessage.includes('エラー') ? 'text-red-500' : 'text-green-600'
            }`}>
              {uploadMessage}
            </p>
          )}
          <button
            onClick={handleImageUpload}
            disabled={loading || !imageFile}
            className="w-full bg-green-600 text-white rounded-xl py-3 font-bold disabled:opacity-50"
          >
            {loading ? 'アップロード中...' : '画像をアップロード'}
          </button>
        </div>
      )}

      {/* 注意事項 */}
      <div className="m-4 bg-yellow-50 rounded-xl p-4 mb-8">
        <h3 className="font-bold text-yellow-800 text-sm mb-2">注意事項</h3>
        <p className="text-xs text-yellow-700">
          ・画像なしでも6分割のタップ領域は設定されます
        </p>
        <p className="text-xs text-yellow-700">
          ・画像をアップロードするとより見やすくなります
        </p>
        <p className="text-xs text-yellow-700">
          ・変更後はLINEアプリを再起動すると反映されます
        </p>
      </div>
    </div>
  );
}