'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MetaPixel from '@/components/MetaPixel';

// 公式LINEの「友だち追加」URL（環境変数で管理）
const LINE_ADD_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || 'https://lin.ee/xxxxxxx';

function BridgeContent() {
  const searchParams = useSearchParams();
  const fbclid = searchParams.get('fbclid') || '';

  useEffect(() => {
    // Meta Pixelが_fbc/_fbpをCookieに書き込む時間を少し確保してから転送する
    const timer = setTimeout(() => {
      window.location.href = LINE_ADD_FRIEND_URL;
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <MetaPixel />
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4" />
      <p className="text-gray-600 font-bold">公式LINEアカウントへ移動しています...</p>
      <p className="text-xs text-gray-400 mt-2">自動で切り替わらない場合はこちら</p>
      <a
        href={LINE_ADD_FRIEND_URL}
        className="mt-3 text-blue-600 underline text-sm font-bold"
      >
        友だち追加はこちら
      </a>
    </div>
  );
}

export default function LpBridgePage() {
  return (
    <Suspense>
      <BridgeContent />
    </Suspense>
  );
}