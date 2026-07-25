'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import BookingSteps from '@/components/BookingSteps';
import BookingCalendarWidget from '@/components/BookingCalendarWidget';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';
  const staffId = searchParams.get('staffId') || ''; // ''=お任せ
  const staffName = searchParams.get('staffName') || 'お任せ';
  const nominationFee = searchParams.get('nominationFee') || '0';

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const handleNext = () => {
    if (!selectedDate || !selectedTime) {
      alert('カレンダーから日時を選択してください');
      return;
    }
    router.push(
      `/profile?menu=${menu}&time=${time}&price=${price}&date=${selectedDate}&slot=${selectedTime}&staffId=${staffId}&staffName=${encodeURIComponent(staffName)}&nominationFee=${nominationFee}`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
        <h1 className="text-xl font-bold">日時を選択</h1>
        <p className="text-sm mt-1">{menu} / {time} / {price}</p>
        <p className="text-sm mt-1 text-blue-100">担当：{staffName}</p>
      </div>

      <BookingSteps current={3} />

      <div className="p-4">
        <BookingCalendarWidget
          staffId={staffId}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectSlot={(date, slot) => { setSelectedDate(date); setSelectedTime(slot); }}
        />

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