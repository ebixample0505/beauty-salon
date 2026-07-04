'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const SHOP_NAME = 'test美容室'; // 店舗名（必要に応じて変更してください）

// "60分" のような文字列から分数を取り出す（取れなければ60分扱い）
const parseDurationMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
};

// JSTの日付・時刻からUTCのDateオブジェクトを作る
const toUtcDate = (date: string, slot: string): Date | null => {
  if (!date || !slot) return null;
  const d = new Date(`${date}T${slot}:00+09:00`);
  if (isNaN(d.getTime())) return null;
  return d;
};

// iCal/Googleカレンダー用の日時フォーマット（YYYYMMDDTHHMMSSZ）
const formatIcsDate = (d: Date): string => {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

function CompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';
  const date = searchParams.get('date') || '';
  const slot = searchParams.get('slot') || '';
  const staffName = searchParams.get('staffName') || '';

  const startDate = toUtcDate(date, slot);
  const durationMin = parseDurationMinutes(time);
  const endDate = startDate ? new Date(startDate.getTime() + durationMin * 60000) : null;

  const hasCalendarData = !!(startDate && endDate);

  const title = `【${SHOP_NAME}】${menu}のご予約`;
  const description = [
    `メニュー: ${menu}`,
    staffName && `担当: ${staffName}`,
    `料金: ${price}`,
  ].filter(Boolean).join('\\n');

  const handleAddToGoogleCalendar = () => {
    if (!startDate || !endDate) return;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatIcsDate(startDate)}/${formatIcsDate(endDate)}`,
      details: description.replace(/\\n/g, '\n'),
      location: SHOP_NAME,
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const handleDownloadIcs = () => {
    if (!startDate || !endDate) return;
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//' + SHOP_NAME + '//Reservation//JP',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@reservation`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${SHOP_NAME}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservation.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-2xl font-bold mb-2">予約が完了しました</h1>
      <p className="text-gray-500 text-center mb-8">
        LINEメッセージに予約内容を送信しました
      </p>

      {hasCalendarData && (
        <div className="w-full space-y-3 mb-6">
          <p className="text-sm font-bold text-gray-600 text-center mb-1">
            予定をカレンダーに追加できます
          </p>
          <button
            onClick={handleAddToGoogleCalendar}
            className="w-full border-2 border-blue-600 text-blue-600 rounded-xl p-3 font-bold text-sm bg-white"
          >
            📅 Googleカレンダーに追加
          </button>
          <button
            onClick={handleDownloadIcs}
            className="w-full border-2 border-gray-400 text-gray-700 rounded-xl p-3 font-bold text-sm bg-white"
          >
            📱 iPhoneカレンダーに追加（.ics）
          </button>
        </div>
      )}

      <button
        onClick={() => router.push('/')}
        className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg"
      >
        トップに戻る
      </button>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense>
      <CompleteContent />
    </Suspense>
  );
}
