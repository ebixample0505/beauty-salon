'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const DAY_LABELS_JS = ['日', '月', '火', '水', '木', '金', '土']; // JSのgetDay()順

type DaySchedule = {
  isOff: boolean;
  startTime: string;
  endTime: string;
};

type Staff = {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  schedule: DaySchedule[];
};

type BookingRecord = {
  date: string;
  slot: string;
  status: string;
};

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

// JSのgetDay()（0=日曜）を、スケジュール配列のインデックス（0=月曜）に変換
const dateToScheduleIndex = (dateStr: string): number => {
  const d = new Date(dateStr + 'T00:00:00');
  const jsDay = d.getDay();
  return (jsDay + 6) % 7;
};

const toDateString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (d: Date, n: number) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
};

type Availability = '◎' | '○' | '×' | '―' | '休';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';

  const todayDate = new Date();
  const todayStr = toDateString(todayDate);
  const currentTimeStr = `${String(todayDate.getHours()).padStart(2, '0')}:${String(todayDate.getMinutes()).padStart(2, '0')}`;

  const [weekStart, setWeekStart] = useState(todayDate);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(''); // ''=お任せ
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const q = query(collection(db, 'staff'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Staff & { order?: number })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setStaffList(data);
      } catch (error) {
        console.error('スタッフ取得エラー:', error);
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoadingBookings(true);
      try {
        // 複合インデックス不要にするため、confirmedのみで取得しクライアント側で日付を絞り込む
        const q = query(collection(db, 'bookings'), where('status', '==', 'confirmed'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => d.data() as BookingRecord);
        setBookings(data);
      } catch (error) {
        console.error('予約取得エラー:', error);
      } finally {
        setLoadingBookings(false);
      }
    };
    fetchBookings();
  }, []);

  // 選択中の日付が変わったら、その日休みのスタッフを指名していた場合は解除
  useEffect(() => {
    if (!selectedDate || !selectedStaffId) return;
    const idx = dateToScheduleIndex(selectedDate);
    const staff = staffList.find(s => s.id === selectedStaffId);
    if (staff && staff.schedule?.[idx]?.isOff) {
      setSelectedStaffId('');
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const isStaffOffOnSelectedDate = (staff: Staff): boolean => {
    if (!selectedDate) return false;
    const idx = dateToScheduleIndex(selectedDate);
    return !!staff.schedule?.[idx]?.isOff;
  };

  // 指定日・指定時間の空き状況を判定
  const getAvailability = (dateStr: string, slot: string): Availability => {
    // 過去の日時は×
    if (dateStr < todayStr) return '×';
    if (dateStr === todayStr && slot <= currentTimeStr) return '×';

    const idx = dateToScheduleIndex(dateStr);
    const workingStaff = staffList.filter(s => !s.schedule?.[idx]?.isOff);

    if (workingStaff.length === 0) return '休'; // その日は全員休み＝休業日扱い

    const starts = workingStaff.map(s => s.schedule[idx].startTime);
    const ends = workingStaff.map(s => s.schedule[idx].endTime);
    const minStart = starts.reduce((a, b) => (a < b ? a : b));
    const maxEnd = ends.reduce((a, b) => (a > b ? a : b));

    if (slot < minStart || slot >= maxEnd) return '―';

    const availableStaffCount = workingStaff.filter(
      s => slot >= s.schedule[idx].startTime && slot < s.schedule[idx].endTime
    ).length;

    const bookedCount = bookings.filter(b => b.date === dateStr && b.slot === slot).length;
    const remaining = availableStaffCount - bookedCount;

    if (remaining <= 0) return '×';
    if (remaining === 1) return '○';
    return '◎';
  };

  const isSelectable = (mark: Availability) => mark === '◎' || mark === '○';

  const handleSelectSlot = (dateStr: string, slot: string, mark: Availability) => {
    if (!isSelectable(mark)) return;
    setSelectedDate(dateStr);
    setSelectedTime(slot);
  };

  const goPrevWeek = () => {
    const newStart = addDays(weekStart, -7);
    // 今日より前の週には戻れないようにする
    if (toDateString(addDays(newStart, 6)) < todayStr) return;
    setWeekStart(newStart);
  };
  const goNextWeek = () => setWeekStart(addDays(weekStart, 7));

  const markColor = (mark: Availability) => {
    switch (mark) {
      case '◎': return 'text-blue-600';
      case '○': return 'text-green-600';
      case '×': return 'text-gray-300';
      case '―': return 'text-gray-300';
      case '休': return 'text-gray-400';
    }
  };

  const handleNext = () => {
    if (!selectedDate || !selectedTime) {
      alert('カレンダーから日時を選択してください');
      return;
    }
    const selectedStaff = staffList.find(s => s.id === selectedStaffId);
    const staffName = selectedStaff ? selectedStaff.name : 'お任せ';

    router.push(
      `/profile?menu=${menu}&time=${time}&price=${price}&date=${selectedDate}&slot=${selectedTime}&staffId=${selectedStaffId}&staffName=${encodeURIComponent(staffName)}`
    );
  };

  const loading = loadingStaff || loadingBookings;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
        <h1 className="text-xl font-bold">日時を選択</h1>
        <p className="text-sm mt-1">{menu} / {time} / {price}</p>
      </div>

      <div className="p-4">
        {/* 凡例 */}
        <div className="flex gap-4 text-xs mb-3 flex-wrap">
          <span><span className="text-blue-600 font-bold">◎</span> 空きが十分</span>
          <span><span className="text-green-600 font-bold">○</span> 残りわずか</span>
          <span><span className="text-gray-300 font-bold">×</span> 予約不可</span>
          <span><span className="text-gray-300 font-bold">―</span> 営業時間外</span>
          <span><span className="text-gray-400 font-bold">休</span> 休業日</span>
        </div>

        {/* 週送りナビゲーション */}
        <div className="flex justify-between items-center mb-2">
          <button onClick={goPrevWeek} className="text-sm text-blue-600 font-bold px-2 py-1">‹ 前の一週間</button>
          <span className="text-sm font-bold text-gray-700">
            {weekDates[0].getFullYear()}年{weekDates[0].getMonth() + 1}月
          </span>
          <button onClick={goNextWeek} className="text-sm text-blue-600 font-bold px-2 py-1">次の一週間 ›</button>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-12">読み込み中...</p>
        ) : (
          <div className="overflow-x-auto mb-8 border rounded-xl">
            <table className="w-full text-center border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-xs w-16 border-b"></th>
                  {weekDates.map((d, i) => {
                    const dateStr = toDateString(d);
                    const jsDow = d.getDay();
                    const isToday = dateStr === todayStr;
                    return (
                      <th
                        key={i}
                        className={`p-2 text-xs border-b border-l ${
                          jsDow === 0 ? 'text-red-500' : jsDow === 6 ? 'text-blue-500' : 'text-gray-700'
                        } ${isToday ? 'bg-blue-50' : ''}`}
                      >
                        <div className="font-bold">{d.getDate()}</div>
                        <div>({DAY_LABELS_JS[jsDow]})</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(slot => (
                  <tr key={slot}>
                    <td className="p-2 text-xs font-bold border-b bg-gray-50">{slot}</td>
                    {weekDates.map((d, i) => {
                      const dateStr = toDateString(d);
                      const mark = getAvailability(dateStr, slot);
                      const isSelected = selectedDate === dateStr && selectedTime === slot;
                      return (
                        <td
                          key={i}
                          onClick={() => handleSelectSlot(dateStr, slot, mark)}
                          className={`p-2 border-b border-l text-lg font-bold ${
                            isSelectable(mark) ? 'cursor-pointer hover:bg-blue-50' : ''
                          } ${isSelected ? 'bg-blue-600 text-white' : markColor(mark)}`}
                        >
                          {mark}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedDate && selectedTime && (
          <div className="bg-blue-50 rounded-xl p-3 mb-6 text-center font-bold text-blue-700">
            {selectedDate}（{DAY_LABELS_JS[new Date(selectedDate + 'T00:00:00').getDay()]}） {selectedTime}〜 を選択中
          </div>
        )}

        {/* スタッフ指名 */}
        <h2 className="font-bold mb-2">担当スタッフ（任意）</h2>
        {!selectedDate && (
          <p className="text-xs text-gray-400 mb-3">※ カレンダーで日時を選択すると、その日の出勤状況が分かります</p>
        )}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {/* お任せ */}
          <button
            onClick={() => setSelectedStaffId('')}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 ${
              selectedStaffId === ''
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
              お任せ
            </div>
            <span className="text-xs font-bold text-gray-700">指名なし</span>
          </button>

          {staffList.map(staff => {
            const isOff = isStaffOffOnSelectedDate(staff);
            return (
              <button
                key={staff.id}
                onClick={() => !isOff && setSelectedStaffId(staff.id)}
                disabled={isOff}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 relative ${
                  isOff
                    ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                    : selectedStaffId === staff.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {staff.photoUrl ? (
                  <img
                    src={staff.photoUrl}
                    alt={staff.name}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200" />
                )}
                <span className="text-xs font-bold text-gray-700">{staff.name}</span>
                {isOff && (
                  <span className="text-[10px] text-red-500 font-bold absolute top-1 right-1 bg-white px-1 rounded">
                    休み
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg"
        >
          次へ（お客様情報入力）
        </button>
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense>
      <BookingContent />
    </Suspense>
  );
}
