'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc,
  updateDoc, doc, deleteDoc, orderBy, query
} from 'firebase/firestore';
import { requireAdminAuth } from '@/lib/adminAuth';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';

type Menu = {
  id: string;
  name: string;
  time: string;
  price: string;
  description: string;
  isActive: boolean;
  order: number;
};

export default function AdminMenusPage() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMenu, setEditMenu] = useState<Menu | null>(null);
  const [form, setForm] = useState({
    name: '',
    time: '',
    price: '',
    description: '',
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    if (!requireAdminAuth(router)) return;
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    const q = query(collection(db, 'menus'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Menu);
    setMenus(data);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      name: '',
      time: '',
      price: '',
      description: '',
      isActive: true,
      order: menus.length,
    });
    setEditMenu(null);
    setShowForm(false);
  };

  const handleEdit = (menu: Menu) => {
    setForm({
      name: menu.name,
      time: menu.time,
      price: menu.price,
      description: menu.description,
      isActive: menu.isActive,
      order: menu.order,
    });
    setEditMenu(menu);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.time || !form.price) {
      alert('メニュー名・所要時間・料金は必須です');
      return;
    }
    if (editMenu) {
      await updateDoc(doc(db, 'menus', editMenu.id), { ...form });
      alert('メニューを更新しました');
    } else {
      await addDoc(collection(db, 'menus'), {
        ...form,
        order: menus.length,
        createdAt: new Date(),
      });
      alert('メニューを作成しました');
    }
    resetForm();
    fetchMenus();
  };

  const handleToggleActive = async (menu: Menu) => {
    await updateDoc(doc(db, 'menus', menu.id), {
      isActive: !menu.isActive,
    });
    fetchMenus();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このメニューを削除しますか？')) return;
    await deleteDoc(doc(db, 'menus', id));
    fetchMenus();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader title="メニュー管理" subtitle={`${menus.length}件登録`} currentPath="/admin/menus" />

      <div className="bg-white px-4 py-3 flex justify-end border-b">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          + 新規作成
        </button>
      </div>

      {/* 作成・編集フォーム */}
      {showForm && (
        <div className="m-4 bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-4 text-lg">
            {editMenu ? 'メニューを編集' : '新規メニュー作成'}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-bold text-gray-700">
                メニュー名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="例：カット"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">
                  所要時間 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例：60分"
                  value={form.time}
                  onChange={e => setForm({...form, time: e.target.value})}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">
                  料金 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="例：¥4,000"
                  value={form.price}
                  onChange={e => setForm({...form, price: e.target.value})}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">説明</label>
              <textarea
                placeholder="例：シャンプー・ブローが含まれます"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                rows={2}
                className="w-full border rounded-lg p-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">表示順</label>
              <input
                type="number"
                value={form.order}
                onChange={e => setForm({...form, order: Number(e.target.value)})}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm({...form, isActive: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-bold text-gray-700">
                表示する
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-bold"
              >
                {editMenu ? '更新する' : '作成する'}
              </button>
              <button
                onClick={resetForm}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-3 font-bold"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* メニュー一覧 */}
      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-500 py-12">読み込み中...</p>
        ) : menus.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">--</p>
            <p>メニューがありません</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              最初のメニューを作成する
            </button>
          </div>
        ) : (
          menus.map(menu => (
            <div key={menu.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{menu.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      menu.isActive
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {menu.isActive ? '表示中' : '非表示'}
                    </span>
                  </div>
                  {menu.description && (
                    <p className="text-sm text-gray-500 mt-1">{menu.description}</p>
                  )}
                </div>
                <div className="text-right ml-2">
                  <p className="font-bold text-blue-600">{menu.price}</p>
                  <p className="text-xs text-gray-400">{menu.time}</p>
                </div>
              </div>
              <div className="flex gap-2 border-t pt-3">
                <button
                  onClick={() => handleEdit(menu)}
                  className="flex-1 border border-blue-600 text-blue-600 rounded-lg py-2 text-sm font-bold"
                >
                  編集
                </button>
                <button
                  onClick={() => handleToggleActive(menu)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold border ${
                    menu.isActive
                      ? 'border-gray-300 text-gray-600'
                      : 'border-green-500 text-green-600'
                  }`}
                >
                  {menu.isActive ? '非表示にする' : '表示する'}
                </button>
                <button
                  onClick={() => handleDelete(menu.id)}
                  className="flex-1 border border-red-400 text-red-400 rounded-lg py-2 text-sm font-bold"
                >
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}