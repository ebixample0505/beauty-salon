'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection, getDocs,
  doc, deleteDoc
} from 'firebase/firestore';
import { requireAdminAuth } from '@/lib/adminAuth';

type Customer = {
  id: string;
  lineUserId: string;
  name: string;
  phone: string;
  email: string;
  createdAt: any;
  updatedAt: any;
};

type Booking = {
  id: string;
  lineUserId: string;
  menu: string;
  date: string;
  slot: string;
  price: string;
  status: string;
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!requireAdminAuth(router)) return;
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const cSnap = await getDocs(collection(db, 'customers'));
      const cData = cSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Customer[];
      cData.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
      setCustomers(cData);

      const bSnap = await getDocs(collection(db, 'bookings'));
      const bData = bSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      })) as Booking[];
      setBookings(bData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getCustomerBookings = (lineUserId: string) =>
    bookings
      .filter(b => b.lineUserId === lineUserId)
      .sort((a, b) => b.date.localeCompare(a.date));

  const getVisitCount = (lineUserId: string) =>
    bookings.filter(b => b.lineUserId === lineUserId && b.status === 'confirmed').length;

  const getLastVisit = (lineUserId: string) => {
    const confirmed = bookings
      .filter(b => b.lineUserId === lineUserId && b.status === 'confirmed')
      .sort((a, b) => b.date.localeCompare(a.date));
    return confirmed[0]?.date || 'なし';
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchText) return true;
    return (
      c.name?.includes(searchText) ||
      c.phone?.includes(searchText) ||
      c.email?.includes(searchText)
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm('この顧客情報を削除しますか？\n※予約データは削除されません')) return;
    await deleteDoc(doc(db, 'customers', id));
    fetchAll();
    setSelectedCustomer(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );

  const customerBookings = selectedCustomer
    ? getCustomerBookings(selectedCustomer.lineUserId)
    : [];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white p-4">
        <button
          onClick={() => router.push('/admin')}
          className="text-sm text-gray-400 mb-2"
        >
          &lt;- 管理画面に戻る
        </button>
        <h1 className="text-lg font-bold">顧客管理</h1>
        <p className="text-xs text-gray-400 mt-1">{customers.length}名登録</p>
      </div>

      <div className="bg-white p-4 shadow-sm">
        <input
          type="text"
          placeholder="名前・電話番号・メールで検索"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-full border rounded-xl p-3 text-sm"
        />
        {searchText && (
          <p className="text-xs text-gray-400 mt-2">{filteredCustomers.length}件ヒット</p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">--</p>
            <p>顧客が見つかりません</p>
          </div>
        ) : (
          filteredCustomers.map(customer => {
            const visitCount = getVisitCount(customer.lineUserId);
            const lastVisit = getLastVisit(customer.lineUserId);
            return (
              <div
                key={customer.id}
                className="bg-white rounded-xl shadow p-4 cursor-pointer"
                onClick={() => setSelectedCustomer(customer)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-lg">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.phone}</p>
                    {customer.email && (
                      <p className="text-xs text-gray-400">{customer.email}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-blue-600 font-bold text-lg">{visitCount}回</p>
                    <p className="text-xs text-gray-400">来院</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                  最終来院: {lastVisit}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">顧客詳細</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 text-xl"
              >
                X
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3">基本情報</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">お名前</span>
                  <span className="font-bold">{selectedCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">電話番号</span>
                  <span className="font-bold">{selectedCustomer.phone}</span>
                </div>
                {selectedCustomer.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">メール</span>
                    <span className="font-bold">{selectedCustomer.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">来院回数</span>
                  <span className="font-bold text-blue-600">
                    {getVisitCount(selectedCustomer.lineUserId)}回
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">最終来院</span>
                  <span className="font-bold">
                    {getLastVisit(selectedCustomer.lineUserId)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-gray-700 text-sm mb-3">
                予約履歴（{customerBookings.length}件）
              </h3>
              {customerBookings.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">
                  予約履歴がありません
                </p>
              ) : (
                <div className="space-y-2">
                  {customerBookings.map(b => (
                    <div key={b.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm">{b.menu}</p>
                          <p className="text-xs text-gray-500">{b.date} {b.slot}</p>
                          <p className="text-xs text-gray-400">{b.price}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                          b.status === 'confirmed'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-500'
                        }`}>
                          {b.status === 'confirmed' ? '予約済み' : 'キャンセル'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { window.location.href = 'tel:' + selectedCustomer.phone; }}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold text-center block"
              >
                電話をかける
              </button>
              {selectedCustomer.email && (
                <button
                  onClick={() => { window.location.href = 'mailto:' + selectedCustomer.email; }}
                  className="w-full bg-green-600 text-white rounded-xl py-3 font-bold text-center block"
                >
                  メールを送る
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedCustomer.id)}
                className="w-full border border-red-400 text-red-400 rounded-xl py-3 font-bold"
              >
                顧客情報を削除
              </button>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full border border-gray-300 text-gray-600 rounded-xl py-3 font-bold"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}