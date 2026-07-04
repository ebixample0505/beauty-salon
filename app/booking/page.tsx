'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];

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

// JSのgetDay()（0=日曜）を、スケジュール配列のインデックス（0=月曜）に変換
const dateToScheduleIndex = (dateStr: string): number => {
  const d = new Date(dateStr + 'T00:00:00');
  const jsDay = d.getDay(); // 0=Sun,1=Mon,...
  return (jsDay + 6) % 7; // 0=Mon,...,6=Sun
};

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(''); // ''=お任せ
  const [loadingStaff, setLoadingStaff] = useState(true);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30',
  ];

  useEffect(() => {
    const fetchStaff = async () => {
      const q = query(
        collection(db, 'staff'),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Staff);
      setStaffList(data);
      setLoadingStaff(false);
    };
    fetchStaff();
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

  const handleNext = () => {
    if (!selectedDate || !selectedTime) {
      alert('日付と時間を選択してください');
      return;
    }
    const selectedStaff = staffList.find(s => s.id === selectedStaffId);
    const staffName = selectedStaff ? selectedStaff.name : 'お任せ';

    router.push(
      `/profile?menu=${menu}&time=${time}&price=${price}&date=${selectedDate}&slot=${selectedTime}&staffId=${selectedStaffId}&staffName=${encodeURIComponent(staffName)}`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
        <h1 className="text-xl font-bold">日時を選択</h1>
        <p className="text-sm mt-1">{menu} / {time} / {price}</p>
      </div>

      <div className="p-4">
        <h2 className="font-bold mb-2">日付</h2>
        <input
          type="date"
          className="w-full border rounded-xl p-3 mb-6 text-lg"
          value={selectedDate}
          min={new Date().toISOString().split('T')[0]}
          onChange={e => setSelectedDate(e.target.value)}
        />

        <h2 className="font-bold mb-2">時間帯</h2>
        <div className="grid grid-cols-4 gap-2 mb-8">
          {timeSlots.map(slot => (
            <button
              key={slot}
              onClick={() => setSelectedTime(slot)}
              className={`p-2 rounded-lg text-sm font-bold border ${
                selectedTime === slot
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {slot}
            </button>
          ))}
        </div>

        {/* スタッフ指名 */}
        <h2 className="font-bold mb-2">担当スタッフ（任意）</h2>
        {!selectedDate && (
          <p className="text-xs text-gray-400 mb-3">※ 日付を選択すると、その日の出勤状況が分かります</p>
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

          {loadingStaff ? (
            <p className="col-span-2 text-sm text-gray-400 self-center">読み込み中...</p>
          ) : (
            staffList.map(staff => {
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
            })
          )}
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
