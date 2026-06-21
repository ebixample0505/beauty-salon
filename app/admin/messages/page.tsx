'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc
} from 'firebase/firestore';
import { requireAdminAuth } from '@/lib/adminAuth';

type Customer = {
  id: string;
  lineUserId: string;
  name: string;
  phone: string;
  email: string;
};

type Booking = {
  id: string;
  lineUserId: string;
  menu: string;
  date: string;
  status: string;
};

type Message = {
  id: string;
  title: string;
  content: string;
  sentCount: number;
  clickCount: number;
  condition: string;
  createdAt: any;
};

export default function AdminMessagesPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [conditionType, setConditionType] = useState<'all' | 'visit_count' | 'last_visit' | 'menu'>('all');
  const [conditionValue, setConditionValue] = useState('');
  const [conditionMenu, setConditionMenu] = useState('');
  const [previewTargets, setPreviewTargets] = useState<Customer[]>([]);

  useEffect(() => {
    if (!requireAdminAuth(router)) return;
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const cSnap = await getDocs(collection(db, 'customers'));
      const cData = cSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Customer[];
      setCustomers(cData);

      const bSnap = await getDocs(collection(db, 'bookings'));
      const bData = bSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Booking[];
      setBookings(bData);

      const mSnap = await getDocs(collection(db, 'messages'));
      const mData = mSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Message[];
      mData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setMessages(mData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getTargetCustomers = (): Customer[] => {
    switch (conditionType) {
      case 'all':
        return customers;
      case 'visit_count': {
        const minCount = parseInt(conditionValue) || 1;
        return customers.filter(c => {
          const count = bookings.filter(
            b => b.lineUserId === c.lineUserId && b.status === 'confirmed'
          ).length;
          return count >= minCount;
        });
      }
      case 'last_visit': {
        const months = parseInt(conditionValue) || 3;
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - months);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        return customers.filter(c => {
          const lastVisit = bookings
            .filter(b => b.lineUserId === c.lineUserId && b.status === 'confirmed')
            .sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
          return lastVisit && lastVisit < cutoffStr;
        });
      }
      case 'menu': {
        return customers.filter(c =>
          bookings.some(
            b => b.lineUserId === c.lineUserId &&
            b.menu === conditionMenu &&
            b.status === 'confirmed'
          )
        );
      }
      default:
        return customers;
    }
  };

  const handlePreview = () => {
    const targets = getTargetCustomers();
    setPreviewTargets(targets);
  };

  const handleSend = async () => {
    if (!title || !content) {
      alert('タイトルとメッセージ内容を入力してください');
      return;
    }
    const targets = getTargetCustomers();
    if (targets.length === 0) {
      alert('送信対象の顧客がいません');
      return;
    }
    if (!confirm(`${targets.length}名に送信しますか？`)) return;

    setSending(true);
    try {
      const messageRef = await addDoc(collection(db, 'messages'), {
        title,
        content,
        condition: conditionType,
        conditionValue,
        sentCount: targets.length,
        clickCount: 0,
        createdAt: new Date(),
      });

      const res = await fetch('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targets: targets.map(t => t.lineUserId),
          content: content + `\n\n詳細・予約はこちら\nhttps://dental-clinic-indol-pi.vercel.app?mid=${messageRef.id}`,
        }),
      });

      if (res.ok) {
        alert(`${targets.length}名への送信が完了しました！`);
        setTitle('');
        setContent('');
        setPreviewTargets([]);
        fetchAll();
      } else {
        alert('送信に失敗しました');
      }
    } catch (e) {
      console.error(e);
      alert('エラーが発生しました');
    } finally {
      setSending(false);
    }
  };

  const menuList = [...new Set(bookings.map(b => b.menu))];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white p-4">
        <button
          onClick={() => router.push('/admin')}
          className="text-sm text-gray-400 mb-2"
        >
          &lt;- 管理画面に戻る
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">メッセージ管理</h1>
            <p className="text-xs text-gray-400 mt-1">
              登録顧客: {customers.length}名
            </p>
          </div>
        </div>
      </div>

      <div className="flex bg-white border-b">
        {(['send', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-bold ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            {tab === 'send' ? 'メッセージ作成' : '送信履歴'}
          </button>
        ))}
      </div>

      {activeTab === 'send' && (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">メッセージ内容</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-gray-700">タイトル（管理用）</label>
                <input
                  type="text"
                  placeholder="例：6月キャンペーン告知"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700">メッセージ本文</label>
                <textarea
                  placeholder="例：いつもご来店ありがとうございます。今月限定のキャンペーンのご案内です..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={6}
                  className="w-full border rounded-lg p-2 mt-1 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {content.length}文字（予約URLが自動で追加されます）
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-bold mb-3">送信対象の条件</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-gray-700">条件タイプ</label>
                <select
                  value={conditionType}
                  onChange={e => {
                    setConditionType(e.target.value as any);
                    setPreviewTargets([]);
                  }}
                  className="w-full border rounded-lg p-2 mt-1"
                >
                  <option value="all">全顧客</option>
                  <option value="visit_count">来院回数で絞り込み</option>
                  <option value="last_visit">最終来院日で絞り込み</option>
                  <option value="menu">メニューで絞り込み</option>
                </select>
              </div>

              {conditionType === 'visit_count' && (
                <div>
                  <label className="text-sm font-bold text-gray-700">来院回数（以上）</label>
                  <input
                    type="number"
                    placeholder="例：3"
                    value={conditionValue}
                    onChange={e => setConditionValue(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-1"
                  />
                </div>
              )}

              {conditionType === 'last_visit' && (
                <div>
                  <label className="text-sm font-bold text-gray-700">
                    最終来院からの経過月数（以上）
                  </label>
                  <input
                    type="number"
                    placeholder="例：3"
                    value={conditionValue}
                    onChange={e => setConditionValue(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-1"
                  />
                </div>
              )}

              {conditionType === 'menu' && (
                <div>
                  <label className="text-sm font-bold text-gray-700">メニュー</label>
                  <select
                    value={conditionMenu}
                    onChange={e => setConditionMenu(e.target.value)}
                    className="w-full border rounded-lg p-2 mt-1"
                  >
                    <option value="">選択してください</option>
                    {menuList.map(menu => (
                      <option key={menu} value={menu}>{menu}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={handlePreview}
                className="w-full border border-blue-600 text-blue-600 rounded-lg py-2 font-bold text-sm"
              >
                対象顧客を確認する
              </button>
            </div>
          </div>

          {previewTargets.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-bold mb-3">
                送信対象
                <span className="ml-2 text-blue-600">{previewTargets.length}名</span>
              </h2>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {previewTargets.map(c => (
                  <div key={c.id} className="flex justify-between items-center py-1 border-b">
                    <span className="font-bold text-sm">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !title || !content}
            className="w-full bg-blue-600 text-white rounded-xl py-4 font-bold text-lg disabled:opacity-50"
          >
            {sending ? '送信中...' : `送信する（${getTargetCustomers().length}名）`}
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-4">--</p>
              <p>送信履歴がありません</p>
            </div>
          ) : (
            messages.map(message => (
              <div key={message.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{message.title}</h3>
                  <span className="text-xs text-gray-400">
                    {message.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || ''}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {message.content}
                </p>
                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{message.sentCount}</p>
                    <p className="text-xs text-gray-500">送信数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">{message.clickCount}</p>
                    <p className="text-xs text-gray-500">クリック数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-600">
                      {message.sentCount > 0
                        ? Math.round((message.clickCount / message.sentCount) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-gray-500">CTR</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}