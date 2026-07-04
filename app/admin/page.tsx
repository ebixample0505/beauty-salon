'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query,
  orderBy, updateDoc, doc
} from 'firebase/firestore';
import { addPointsForPayment } from '@/lib/customer';

type Booking = {
  id: string;
  name: string;
  phone: string;
  email: string;
  menu: string;
  date: string;
  slot: string;
  time: string;
  price: string;
  status: string;
  lineUserId: string;
  createdAt: any;
  paymentStatus?: string; // 'paid' で会計完了
  paidAmount?: number;
  pointsEarned?: number;
};

// "¥4,000" のような文字列から数値だけ取り出す
const parsePriceToNumber = (priceStr: string): number => {
  const digits = priceStr.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'week' | 'list'>('calendar');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'cancelled'>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  // 会計完了フォーム用
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };
  const [weekStart, setWeekStart] = useState(getWeekStart(today));

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true';
    if (!isAuthenticated) {
      window.location.href = '/admin/login';
      return;
    }
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const q = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Booking[];
      setBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!confirm('ステータスを変更しますか？')) return;
    await updateDoc(doc(db, 'bookings', id), { status });
    fetchBookings();
    setSelectedBooking(null);
  };

  const openPaymentForm = (booking: Booking) => {
    setPaymentAmount(String(parsePriceToNumber(booking.price)));
    setShowPaymentForm(true);
  };

  const handleCompletePayment = async () => {
    if (!selectedBooking) return;
    const amount = parseInt(paymentAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('正しい金額を入力してください');
      return;
    }
    if (!selectedBooking.lineUserId) {
      alert('この予約には顧客情報が紐付いていないため、ポイントを付与できません');
      return;
    }

    setProcessingPayment(true);
    try {
      const earnedPoints = await addPointsForPayment(
        selectedBooking.lineUserId,
        amount,
        selectedBooking.id
      );

      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        paymentStatus: 'paid',
        paidAmount: amount,
        pointsEarned: earnedPoints,
      });

      alert(`会計完了！ ${earnedPoints}ポイントを付与しました`);
      setShowPaymentForm(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (e) {
      console.error(e);
      alert('会計処理に失敗しました');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    window.location.href = '/admin/login';
  };

  const toDateString = (date: Date) => date.toISOString().split('T')[0];

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const days = getDaysInMonth(currentYear, currentMonth);

  const getDateString = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  const getBookingsForDate = (dateStr: string) =>
    bookings.filter(b => b.date === dateStr && b.status === 'confirmed');

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setSelectedDate('');
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setSelectedDate('');
  };

  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();

  const weekLabel = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${weekStart.getFullYear()}年 ${fmt(weekStart)} 〜 ${fmt(end)}`;
  };

  const todayStr = toDateString(today);

  const statusLabel = (b: Booking) => {
    if (b.status === 'cancelled') return { label: 'キャンセル', color: 'bg-red-100 text-red-500' };
    if (b.paymentStatus === 'paid') return { label: '会計済み', color: 'bg-blue-100 text-blue-600' };
    if (b.date < todayStr) return { label: '来院済み', color: 'bg-gray-100 text-gray-500' };
    return { label: '予約済み', color: 'bg-green-100 text-green-600' };
  };

  const filteredBookings = bookings.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const selectedDateBookings = selectedDate
    ? bookings.filter(b => b.date === selectedDate).sort((a, b) => a.slot.localeCompare(b.slot))
    : [];

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dayNames = ['日','月','火','水','木','金','土'];

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const { label, color } = statusLabel(booking);
    return (
      <div
        className="bg-white rounded-xl shadow p-4 cursor-pointer"
        onClick={() => { setSelectedBooking(booking); setShowPaymentForm(false); }}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold">{booking.name || '名前未登録'}</p>
            <p className="text-sm text-gray-500">{booking.phone}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-bold ${color}`}>
            {label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
          <p>{booking.date}</p>
          <p>{booking.slot}</p>
          <p>{booking.menu}</p>
          <p>{booking.price}</p>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-lg font-bold">管理画面</h1>
        <p className="text-xs text-gray-400">美容室予約管理システム</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => window.location.href = '/admin/customers'}
            className="bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            顧客管理
          </button>
          <button
            onClick={() => window.location.href = '/admin/coupons'}
            className="bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            クーポン管理
          </button>
          <button
            onClick={() => window.location.href = '/admin/messages'}
            className="bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            メッセージ管理
          </button>
          <button
            onClick={() => window.location.href = '/admin/menus'}
            className="bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            メニュー管理
          </button>
          <button
            onClick={() => window.location.href = '/admin/richmenu'}
            className="bg-gray-700 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            リッチメニュー
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* タブ */}
      <div className="flex bg-white border-b">
        {(['calendar', 'week', 'list'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedDate(''); }}
            className={`flex-1 py-3 text-sm font-bold ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            {tab === 'calendar' ? '月' : tab === 'week' ? '週' : '一覧'}
          </button>
        ))}
      </div>

      {/* 月カレンダー */}
      {activeTab === 'calendar' && (
        <div>
          <div className="bg-white p-4 flex justify-between items-center shadow-sm">
            <button onClick={prevMonth} className="text-2xl text-gray-600 px-2">‹</button>
            <h2 className="text-lg font-bold">{currentYear}年 {monthNames[currentMonth]}</h2>
            <button onClick={nextMonth} className="text-2xl text-gray-600 px-2">›</button>
          </div>

          <div className="bg-white grid grid-cols-7 text-center text-xs font-bold py-2 border-b">
            {dayNames.map((d, i) => (
              <div key={d} className={`py-1 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'}`}>
                {d}
              </div>
            ))}
          </div>

          <div className="bg-white grid grid-cols-7 gap-px border-b">
            {days.map((day, idx) => {
              if (!day) return <div key={idx} className="bg-gray-50 h-16" />;
              const dateStr = getDateString(day);
              const dayBookings = getBookingsForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dow = idx % 7;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(dateStr === selectedDate ? '' : dateStr)}
                  className={`h-16 p-1 cursor-pointer border border-gray-100 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
                >
                  <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-blue-600 text-white' :
                    dow === 0 ? 'text-red-500' :
                    dow === 6 ? 'text-blue-500' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="bg-blue-500 text-white text-xs rounded px-1 text-center leading-tight">
                      {dayBookings.length}件
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedDate && (
            <div className="p-4">
              <h3 className="font-bold mb-3 text-gray-700">
                {selectedDate} の予約
                <span className="ml-2 text-blue-600">({selectedDateBookings.length}件)</span>
              </h3>
              {selectedDateBookings.length === 0 ? (
                <p className="text-center text-gray-400 py-6">この日の予約はありません</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 週カレンダー */}
      {activeTab === 'week' && (
        <div>
          <div className="bg-white p-4 flex justify-between items-center shadow-sm">
            <button onClick={prevWeek} className="text-2xl text-gray-600 px-2">‹</button>
            <h2 className="text-sm font-bold">{weekLabel()}</h2>
            <button onClick={nextWeek} className="text-2xl text-gray-600 px-2">›</button>
          </div>

          <div className="bg-white grid grid-cols-7 gap-px border-b">
            {weekDays.map((date, i) => {
              const dateStr = toDateString(date);
              const dayBookings = getBookingsForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(dateStr === selectedDate ? '' : dateStr)}
                  className={`cursor-pointer border border-gray-100 p-1 min-h-24 ${
                    isSelected ? 'bg-blue-50' : 'bg-white'
                  }`}
                >
                  <div className={`text-xs text-center mb-1 ${
                    i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
                  }`}>
                    {dayNames[i]}
                  </div>
                  <div className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full mx-auto mb-2 ${
                    isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                  }`}>
                    {date.getDate()}
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map(b => (
                        <div
                          key={b.id}
                          className="bg-blue-100 text-blue-700 text-xs rounded px-1 truncate leading-tight py-0.5"
                        >
                          {b.slot} {b.name?.split(' ')[0] || '予約'}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-400 text-center">
                          +{dayBookings.length - 3}件
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedDate && (
            <div className="p-4">
              <h3 className="font-bold mb-3 text-gray-700">
                {selectedDate} の予約
                <span className="ml-2 text-blue-600">({selectedDateBookings.length}件)</span>
              </h3>
              {selectedDateBookings.length === 0 ? (
                <p className="text-center text-gray-400 py-6">この日の予約はありません</p>
              ) : (
                <div className="space-y-3">
                  {selectedDateBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              )}
            </div>
          )}

          {!selectedDate && (
            <div className="p-4">
              <h3 className="font-bold mb-3 text-gray-700">今週の予約一覧</h3>
              {(() => {
                const weekBookings = bookings.filter(b => {
                  const weekEndStr = toDateString(weekDays[6]);
                  const weekStartStr = toDateString(weekDays[0]);
                  return b.date >= weekStartStr && b.date <= weekEndStr && b.status === 'confirmed';
                }).sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));
                return weekBookings.length === 0 ? (
                  <p className="text-center text-gray-400 py-6">今週の予約はありません</p>
                ) : (
                  <div className="space-y-3">
                    {weekBookings.map(b => <BookingCard key={b.id} booking={b} />)}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 一覧ビュー */}
      {activeTab === 'list' && (
        <div>
          <div className="bg-white p-4 shadow-sm">
            <div className="flex gap-2">
              {(['all', 'confirmed', 'cancelled'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-full text-sm font-bold border ${
                    filterStatus === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {s === 'all' ? 'すべて' : s === 'confirmed' ? '予約済み' : 'キャンセル'}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 text-sm text-gray-500">{filteredBookings.length}件</div>
          <div className="p-4 space-y-3">
            {filteredBookings.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">予約詳細</h2>
              <button
                onClick={() => { setSelectedBooking(null); setShowPaymentForm(false); }}
                className="text-gray-400 text-xl"
              >
                X
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-gray-700 text-sm">お客様情報</h3>
                <p><span className="text-gray-500 text-sm">お名前：</span><span className="font-bold">{selectedBooking.name}</span></p>
                <p><span className="text-gray-500 text-sm">電話番号：</span><span className="font-bold">{selectedBooking.phone}</span></p>
                {selectedBooking.email && (
                  <p><span className="text-gray-500 text-sm">メール：</span><span className="font-bold">{selectedBooking.email}</span></p>
                )}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <h3 className="font-bold text-gray-700 text-sm">予約内容</h3>
                <p><span className="text-gray-500 text-sm">メニュー：</span><span className="font-bold">{selectedBooking.menu}</span></p>
                <p><span className="text-gray-500 text-sm">日付：</span><span className="font-bold">{selectedBooking.date}</span></p>
                <p><span className="text-gray-500 text-sm">時間：</span><span className="font-bold">{selectedBooking.slot}（{selectedBooking.time}）</span></p>
                <p><span className="text-gray-500 text-sm">料金：</span><span className="font-bold text-blue-600">{selectedBooking.price}</span></p>
              </div>

              {/* 会計・ポイント情報 */}
              {selectedBooking.paymentStatus === 'paid' ? (
                <div className="bg-blue-50 rounded-xl p-4 space-y-1">
                  <h3 className="font-bold text-blue-700 text-sm">会計済み</h3>
                  <p><span className="text-gray-500 text-sm">支払金額：</span><span className="font-bold">¥{selectedBooking.paidAmount?.toLocaleString()}</span></p>
                  <p><span className="text-gray-500 text-sm">付与ポイント：</span><span className="font-bold text-blue-600">{selectedBooking.pointsEarned}pt</span></p>
                </div>
              ) : (
                showPaymentForm ? (
                  <div className="bg-yellow-50 rounded-xl p-4 space-y-3">
                    <h3 className="font-bold text-gray-700 text-sm">会計金額を入力</h3>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full border rounded-lg p-3 text-lg"
                      placeholder="実際の支払金額"
                    />
                    <p className="text-xs text-gray-500">
                      付与予定ポイント：{paymentAmount ? Math.floor(Number(paymentAmount) / 100) : 0}pt（100円ごとに1pt）
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCompletePayment}
                        disabled={processingPayment}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-bold disabled:opacity-50"
                      >
                        {processingPayment ? '処理中...' : '確定してポイント付与'}
                      </button>
                      <button
                        onClick={() => setShowPaymentForm(false)}
                        className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-3 font-bold"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : null
              )}
            </div>
            <div className="space-y-2">
              {selectedBooking.status === 'confirmed' && selectedBooking.paymentStatus !== 'paid' && !showPaymentForm && (
                <button
                  onClick={() => openPaymentForm(selectedBooking)}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold"
                >
                  💰 会計完了（ポイント付与）
                </button>
              )}
              {selectedBooking.status === 'confirmed' && (
                <button
                  onClick={() => handleStatusChange(selectedBooking.id, 'cancelled')}
                  className="w-full border border-red-400 text-red-400 rounded-xl py-3 font-bold"
                >
                  キャンセルする
                </button>
              )}
              {selectedBooking.status === 'cancelled' && (
                <button
                  onClick={() => handleStatusChange(selectedBooking.id, 'confirmed')}
                  className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold"
                >
                  予約を復元する
                </button>
              )}
              <button
                onClick={() => { setSelectedBooking(null); setShowPaymentForm(false); }}
                className="w-full border border-gray-300 text-gray-600 rounded-xl py-3 font-bold"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
