'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import liff from '@line/liff';

const SHOP_NAME = 'test美容室'; // 店舗名（必要に応じて変更してください）

const toUtcDate = (date: string, slot: string): Date | null => {
  if (!date || !slot) return null;
  const d = new Date(`${date}T${slot}:00+09:00`);
  if (isNaN(d.getTime())) return null;
  return d;
};

const formatIcsDate = (d: Date): string => {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

const parseDurationMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
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
  const phone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';
  const bookingId = searchParams.get('bookingId') || '';
  const finalAmount = searchParams.get('finalAmount') || '';
  const lineUserId = searchParams.get('lineUserId') || '';

  const startDate = toUtcDate(date, slot);
  const durationMin = parseDurationMinutes(time);
  const endDate = startDate ? new Date(startDate.getTime() + durationMin * 60000) : null;
  const hasCalendarData = !!(startDate && endDate);

  useEffect(() => {
    // LIFFの外部ブラウザ機能を使うためにinitしておく（未初期化でも他ページで済んでいれば無害）
    liff.init({ liffId: '2010454791-miMuAYxd' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!bookingId) return; // 予約IDが無い場合（直接アクセス等）は送信しない

    const value = finalAmount ? Number(finalAmount) : undefined;

    // クライアント側のPixelイベント（同じevent_idでサーバー送信と重複排除される）
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.fbq) {
        // @ts-ignore
        window.fbq('track', 'Schedule', { value, currency: 'JPY' }, { eventID: bookingId });
      }
    } catch (e) {
      console.log('fbqエラー:', e);
    }

    // サーバー側からMeta Conversions APIへ送信
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
        lineUserId,
      }),
    }).catch(e => console.log('コンバージョン送信エラー:', e));
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openUrl = (url: string) => {
    try {
      if (liff.isInClient()) {
        // LIFF内蔵ブラウザではなく、端末標準のブラウザ(Safari等)で開く
        liff.openWindow({ url, external: true });
      } else {
        window.open(url, '_blank');
      }
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleAddToGoogleCalendar = () => {
    if (!startDate || !endDate) return;
    const title = `【${SHOP_NAME}】${menu}のご予約`;
    const description = [
      `メニュー: ${menu}`,
      staffName && `担当: ${staffName}`,
      `料金: ${price}`,
    ].filter(Boolean).join('\n');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatIcsDate(startDate)}/${formatIcsDate(endDate)}`,
      details: description,
      location: SHOP_NAME,
    });
    openUrl(`https://calendar.google.com/calendar/render?${params.toString()}`);
  };

  const handleAddToIphoneCalendar = () => {
    const params = new URLSearchParams({
      menu, time, price, date, slot, staffName,
    });
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    openUrl(`${origin}/api/ics?${params.toString()}`);
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
            onClick={handleAddToIphoneCalendar}
            className="w-full border-2 border-gray-400 text-gray-700 rounded-xl p-3 font-bold text-sm bg-white"
          >
            📱 iPhoneカレンダーに追加
          </button>
          <p className="text-xs text-gray-400 text-center">
            ※ タップすると外部ブラウザが開きます
          </p>
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