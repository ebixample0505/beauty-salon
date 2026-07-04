import { NextRequest, NextResponse } from 'next/server';

const SHOP_NAME = 'test美容室'; // 店舗名（必要に応じて変更してください）

const parseDurationMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
};

const formatIcsDate = (d: Date): string => {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';
  const date = searchParams.get('date') || '';
  const slot = searchParams.get('slot') || '';
  const staffName = searchParams.get('staffName') || '';

  if (!date || !slot) {
    return NextResponse.json({ error: '日付・時間が指定されていません' }, { status: 400 });
  }

  const startDate = new Date(`${date}T${slot}:00+09:00`);
  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: '日時の形式が不正です' }, { status: 400 });
  }
  const durationMin = parseDurationMinutes(time);
  const endDate = new Date(startDate.getTime() + durationMin * 60000);

  const title = `【${SHOP_NAME}】${menu}のご予約`;
  const descriptionLines = [
    `メニュー: ${menu}`,
    staffName && `担当: ${staffName}`,
    `料金: ${price}`,
  ].filter(Boolean);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//' + SHOP_NAME + '//Reservation//JP',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@reservation`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${descriptionLines.join('\\n')}`,
    `LOCATION:${SHOP_NAME}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reservation.ics"',
    },
  });
}