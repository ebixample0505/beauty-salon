'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import liff from '@line/liff';

type Booking = {
  id: string;
  menu: string;
  date: string;
  slot: string;
  price: string;
  time: string;
  status: string;
  name: string;
  phone: string;
  email: string;
};

export default function MyPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('temp-user');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  useEffect(() => {
    const init = async () => {
      let uid = 'temp-user';
      try {
        // ローカルホストでのテスト時はLIFF初期化をスキップ
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        
        if (!isLocalhost) {
          await liff.init({ liffId: '2010454791-miMuAYxd' });
          if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            uid = profile.userId;
            setUserId(uid);
          }
        }
      } catch (e) {
        console.log('LIFF初期化エラー:', e);
      } finally {
        fetchBookings(uid);
      }
    };
    init();
  }, []);

  const fetchBookings = async (uid: string = 'temp-user') => {
    try {
      const q = query(
        collection(db, 'bookings'),
        where('lineUserId', '==', uid)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Booking[];
      // 日付の新しい順に並び替え
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('予約をキャンセルしますか？')) return;
    try {
      await updateDoc(doc(db, 'bookings', id), {
        status: 'cancelled',
      });
      fetchBookings(userId);
      alert('予約をキャンセルしました');
    } catch (e) {
      console.error(e);
    }
  };

  // 今日の日付
  const today = new Date().toISOString().split('T')[0];

  // タブごとにフィルタリング
  const upcomingBookings = bookings.filter(b =>
    b.status === 'confirmed' && b.date >= today
  );
  const historyBookings = bookings.filter(b =>
    b.status === 'cancelled' || b.date < today
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-start mb-3">
        <span className="font-bold text-lg">{booking.menu}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
          booking.status === 'confirmed'
            ? booking.date >= today
              ? 'bg-green-100 text-green-600'
              : 'bg-gray-100 text-gray-500'
            : 'bg-red-100 text-red-500'
        }`}>
          {booking.status === 'confirmed'
            ? booking.date >= today ? '予約済み' : '来院済み'
            : 'キャンセル済み'}
        </span>
      </div>
      <div className="space-y-1 text-sm text-gray-600 mb-3">
        <p>📅 {booking.date}</p>
        <p>🕐 {booking.slot}（{booking.time}）</p>
        <p>💴 {booking.price}</p>
        {booking.name && <p>👤 {booking.name}</p>}
      </div>
      {booking.status === 'confirmed' && booking.date >= today && (
        <button
          onClick={() => handleCancel(booking.id)}
          className="w-full border border-red-400 text-red-400 rounded-lg py-2 text-sm font-bold cursor-pointer"
        >
          キャンセルする
        </button>
      )}}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.push('/')} className="text-sm mb-2 cursor-pointer">← 戻る</button>
        <h1 className="text-xl font-bold">予約確認・履歴</h1>
      </div>

      {/* タブ */}
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-3 font-bold text-sm cursor-pointer ${
            activeTab === 'upcoming'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          予約済み
          {upcomingBookings.length > 0 && (
            <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">
              {upcomingBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 font-bold text-sm cursor-pointer ${
            activeTab === 'history'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
        >
          過去の履歴
          {historyBookings.length > 0 && (
            <span className="ml-1 bg-gray-400 text-white text-xs rounded-full px-1.5 py-0.5">
              {historyBookings.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'upcoming' && (
          upcomingBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-4">📅</p>
              <p>予約はありません</p>
              <button
                onClick={() => router.push('/')}
                className="mt-4 bg-blue-600 text-white rounded-xl px-6 py-3 font-bold cursor-pointer"
              >
                予約する
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )
        )}

        {activeTab === 'history' && (
          historyBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-4xl mb-4">📋</p>
              <p>過去の履歴はありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}