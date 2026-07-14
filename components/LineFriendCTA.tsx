const LINE_ADD_FRIEND_URL = process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL || 'https://lin.ee/xxxxxxx';

type Props = {
  variant?: 'banner' | 'button';
};

// サーバーコンポーネントとして動作（クリック以外の処理がないため 'use client' 不要）
export default function LineFriendCTA({ variant = 'banner' }: Props) {
  if (variant === 'button') {
    return (
      <a
        href={LINE_ADD_FRIEND_URL}
        className="block w-full bg-[#06C755] text-white text-center py-4 rounded-xl font-bold text-lg"
      >
        📱 公式LINEを友だち追加する
      </a>
    );
  }

  return (
    <a
      href={LINE_ADD_FRIEND_URL}
      className="flex items-center justify-between gap-3 bg-[#06C755] text-white px-4 py-2.5 text-sm font-bold"
    >
      <span>🎁 LINE友だち追加で予約がもっと便利に</span>
      <span className="shrink-0 bg-white text-[#06C755] px-3 py-1 rounded-full text-xs">
        追加する ›
      </span>
    </a>
  );
}