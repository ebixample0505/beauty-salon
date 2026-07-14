'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import LineFriendCTA from '@/components/LineFriendCTA';

const SHOP_NAME = 'test美容室';

const toUtcDate = (date: string, slot: string): Date | null => {
  if (!date || !slot) return null;
  const d = new Date(`${date}T${slot}:00+09:00`);
  if (isNaN(d.getTime())) return null;
  return d;
};

const formatIcsDate = (d: Date): string =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

const parseDurationMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
};

function CompleteContent() {
  const searchParams = useSearchParams();

  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';
  const date = searchParams.get('date') || '';
  const slot = searchParams.get('slot') || '';
  const staffName = searchParams.get('staffName') || '';
  const phone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';
  const bookingId = searchParams.get('bookingId') || '';
  const finalAmount = searchParams.get('finalAmount') || '';
  const webUserId = searchParams.get('webUserId') || '';

  const startDate = toUtcDate(date, slot);
  const durationMin = parseDurationMinutes(time);
  const endDate = startDate ? new Date(startDate.getTime() + durationMin * 60000) : null;
  const hasCalendarData = !!(startDate && endDate);

  useEffect(() => {
    if (!bookingId) return;
    const value = finalAmount ? Number(finalAmount) : undefined;

    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.fbq) {
        // @ts-ignore
        window.fbq('track', 'Schedule', { value, currency: 'JPY' }, { eventID: bookingId });
      }
    } catch (e) {
      console.log('fbqエラー:', e);
    }

    fetch('/api/meta-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: 'Schedule',
        eventId: bookingId,
        phone,
        email,
        value,
        currency: 'JPY',
        lineUserId: webUserId,
      }),
    }).catch(e => console.log('コンバージョン送信エラー:', e));
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToGoogleCalendar = () => {
    if (!startDate || !endDate) return;
    const title = `【${SHOP_NAME}】${menu}のご予約`;
    const description = [`メニュー: ${menu}`, staffName && `担当: ${staffName}`, `料金: ${price}`]
      .filter(Boolean)
      .join('\n');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatIcsDate(startDate)}/${formatIcsDate(endDate)}`,
      details: description,
      location: SHOP_NAME,
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const handleAddToIphoneCalendar = () => {
    const params = new URLSearchParams({ menu, time, price, date, slot, staffName });
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    window.open(`${origin}/api/ics?${params.toString()}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center p-6">
      <div className="text-6xl mb-6">✅</div>
      <h1 className="text-2xl font-bold mb-2">予約が完了しました</h1>
      <p className="text-gray-500 text-center mb-6">
        ご入力いただいたメールアドレスに予約内容をお送りしました
      </p>

      {/* LINE友だち追加の導線 */}
      <div className="w-full bg-white rounded-xl shadow p-5 mb-6 text-center">
        <p className="font-bold text-gray-700 mb-3">
          🎁 公式LINEを友だち追加すると、次回からもっと簡単に予約できます
        </p>
        <LineFriendCTA variant="button" />
      </div>

      {hasCalendarData && (
        <div className="w-full space-y-3 mb-6">
          <p className="text-sm font-bold text-gray-600 text-center mb-1">予定をカレンダーに追加できます</p>
          <button
            onClick={handleAddToGoogleCalendar}
            className="w-full border-2 border-blue-600 text-blue-600 rounded-xl p-3 font-bold text-sm bg-white"
          >
            📅 Googleカレンダーに追加
          </button>
          <button
            onClick={handleAddToIphoneCalendar}
            className="w-full border-2 border-gray-400 text-gray-700 rounded-xl p-3 font-bold text-sm bg-white"
          >
            📱 iPhoneカレンダーに追加
          </button>
        </div>
      )}

      <a
        href="/web"
        className="w-full bg-gray-700 text-white rounded-xl p-4 font-bold text-lg text-center"
      >
        トップに戻る
      </a>
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