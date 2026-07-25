'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const DAY_LABELS_JS = ['日', '月', '火', '水', '木', '金', '土'];

type DaySchedule = {
  isOff: boolean;
  startTime: string;
  endTime: string;
};

type Staff = {
  id: string;
  schedule: DaySchedule[];
};

type BookingRecord = {
  date: string;
  slot: string;
  status: string;
  staffId?: string;
};

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

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

type Props = {
  staffId: string; // ''=お任せ
  selectedDate: string;
  selectedTime: string;
  onSelectSlot: (date: string, slot: string) => void;
};

export default function BookingCalendarWidget({ staffId, selectedDate, selectedTime, onSelectSlot }: Props) {
  const todayDate = new Date();
  const todayStr = toDateString(todayDate);
  const currentTimeStr = `${String(todayDate.getHours()).padStart(2, '0')}:${String(todayDate.getMinutes()).padStart(2, '0')}`;

  const [weekStart, setWeekStart] = useState(todayDate);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const staffQ = query(collection(db, 'staff'), where('isActive', '==', true));
        const bookingQ = query(collection(db, 'bookings'), where('status', '==', 'confirmed'));

        // 2つの問い合わせを同時に実行し、待ち時間を短縮する
        const [staffSnap, bookingSnap] = await Promise.all([getDocs(staffQ), getDocs(bookingQ)]);

        setStaffList(staffSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Staff));
        setBookings(bookingSnap.docs.map(d => d.data() as BookingRecord));
      } catch (e) {
        console.error('カレンダーデータ取得エラー:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getAvailability = (dateStr: string, slot: string): Availability => {
    if (dateStr < todayStr) return '×';
    if (dateStr === todayStr && slot <= currentTimeStr) return '×';

    const idx = dateToScheduleIndex(dateStr);

    if (staffId) {
      const staff = staffList.find(s => s.id === staffId);
      if (!staff) return '×';
      const daySchedule = staff.schedule?.[idx];
      if (!daySchedule || daySchedule.isOff) return '休';
      if (slot < daySchedule.startTime || slot >= daySchedule.endTime) return '―';
      const isBooked = bookings.some(b => b.date === dateStr && b.slot === slot && b.staffId === staffId);
      return isBooked ? '×' : '○';
    }

    const workingStaff = staffList.filter(s => !s.schedule?.[idx]?.isOff);
    if (workingStaff.length === 0) return '休';

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
    onSelectSlot(dateStr, slot);
  };

  const goPrevWeek = () => {
    const newStart = addDays(weekStart, -7);
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

  return (
    <div>
      {/* 凡例 */}
      <div className="flex gap-4 text-xs mb-3 flex-wrap">
        {!staffId && <span><span className="text-blue-600 font-bold">◎</span> 空きが十分</span>}
        <span><span className="text-green-600 font-bold">○</span> 予約できます</span>
        <span><span className="text-gray-300 font-bold">×</span> 予約不可</span>
        <span><span className="text-gray-300 font-bold">―</span> 営業時間外</span>
        <span><span className="text-gray-400 font-bold">休</span> 休業日</span>
      </div>

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
    </div>
  );
}