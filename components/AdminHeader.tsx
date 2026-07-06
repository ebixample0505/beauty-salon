'use client';
import { useRouter } from 'next/navigation';

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: '予約管理', href: '/admin' },
  { label: '顧客管理', href: '/admin/customers' },
  { label: 'スタッフ管理', href: '/admin/staff' },
  { label: 'クーポン管理', href: '/admin/coupons' },
  { label: 'メッセージ管理', href: '/admin/messages' },
  { label: 'メニュー管理', href: '/admin/menus' },
  { label: 'リッチメニュー', href: '/admin/richmenu' },
];

type Props = {
  title: string;
  subtitle?: string;
  currentPath: string; // 例: '/admin/staff'
};

export default function AdminHeader({ title, subtitle, currentPath }: Props) {
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    window.location.href = '/admin/login';
  };

  return (
    <div className="bg-gray-800 text-white p-4">
      <h1 className="text-lg font-bold">{title}</h1>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="flex gap-2 mt-3 flex-wrap">
        {NAV_ITEMS.map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold ${
              currentPath === item.href
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}