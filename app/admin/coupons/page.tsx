'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, addDoc,
  updateDoc, doc, deleteDoc
} from 'firebase/firestore';
import { requireAdminAuth } from '@/lib/adminAuth';

type Coupon = {
  id: string;
  title: string;
  description: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  code: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
};

export default function AdminCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: 10,
    code: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true,
  });

  useEffect(() => {
    if (!requireAdminAuth(router)) return;
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    const snapshot = await getDocs(collection(db, 'coupons'));
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Coupon);
    data.sort((a, b) => a.validUntil.localeCompare(b.validUntil));
    setCoupons(data);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      discountType: 'percent',
      discountValue: 10,
      code: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      isActive: true,
    });
    setEditCoupon(null);
    setShowForm(false);
  };

  const handleEdit = (coupon: Coupon) => {
    setForm({
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      code: coupon.code,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      isActive: coupon.isActive,
    });
    setEditCoupon(coupon);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.code || !form.validUntil) {
      alert('タイトル・コード・有効期限は必須です');
      return;
    }
    if (editCoupon) {
      await updateDoc(doc(db, 'coupons', editCoupon.id), { ...form });
      alert('クーポンを更新しました');
    } else {
      await addDoc(collection(db, 'coupons'), {
        ...form,
        createdAt: new Date(),
      });
      alert('クーポンを作成しました');
    }
    resetForm();
    fetchCoupons();
  };

  const handleToggleActive = async (coupon: Coupon) => {
    await updateDoc(doc(db, 'coupons', coupon.id), {
      isActive: !coupon.isActive,
    });
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このクーポンを削除しますか？')) return;
    await deleteDoc(doc(db, 'coupons', id));
    fetchCoupons();
  };

  const today = new Date().toISOString().split('T')[0];
  const isExpired = (coupon: Coupon) => coupon.validUntil < today;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white p-4">
        <button
          onClick={() => router.push('/admin')}
          className="text-sm text-gray-400 mb-2"
        >
          &lt;- 管理画面に戻る
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">クーポン管理</h1>
            <p className="text-xs text-gray-400 mt-1">{coupons.length}件登録</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm"
          >
            + 新規作成
          </button>
        </div>
      </div>

      {showForm && (
        <div className="m-4 bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-4 text-lg">
            {editCoupon ? 'クーポンを編集' : '新規クーポン作成'}
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-bold text-gray-700">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="初回限定クーポン"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">説明</label>
              <input
                type="text"
                placeholder="初回のご来院に限り割引"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">割引タイプ</label>
                <select
                  value={form.discountType}
                  onChange={e => setForm({...form, discountType: e.target.value as 'percent' | 'fixed'})}
                  className="w-full border rounded-lg p-2 mt-1"
                >
                  <option value="percent">％割引</option>
                  <option value="fixed">円引き</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">
                  割引値（{form.discountType === 'percent' ? '%' : '円'}）
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={e => setForm({...form, discountValue: Number(e.target.value)})}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">
                クーポンコード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="FIRST20"
                value={form.code}
                onChange={e => setForm({...form, code: e.target.value.toUpperCase()})}
                className="w-full border rounded-lg p-2 mt-1 font-mono"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">開始日</label>
                <input
                  type="date"
                  value={form.validFrom}
                  onChange={e => setForm({...form, validFrom: e.target.value})}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">
                  終了日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.validUntil}
                  onChange={e => setForm({...form, validUntil: e.target.value})}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
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
                有効にする
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-bold"
              >
                {editCoupon ? '更新する' : '作成する'}
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

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-500 py-12">読み込み中...</p>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">--</p>
            <p>クーポンがありません</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold"
            >
              最初のクーポンを作成する
            </button>
          </div>
        ) : (
          coupons.map(coupon => (
            <div
              key={coupon.id}
              className={`bg-white rounded-xl shadow overflow-hidden ${
                isExpired(coupon) ? 'opacity-60' : ''
              }`}
            >
              <div className={`h-2 ${
                !coupon.isActive ? 'bg-gray-300' :
                isExpired(coupon) ? 'bg-gray-400' : 'bg-yellow-400'
              }`} />
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{coupon.title}</h3>
                    <p className="text-sm text-gray-500">{coupon.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      !coupon.isActive ? 'bg-gray-100 text-gray-500' :
                      isExpired(coupon) ? 'bg-gray-100 text-gray-500' :
                      'bg-green-100 text-green-600'
                    }`}>
                      {!coupon.isActive ? '無効' : isExpired(coupon) ? '期限切れ' : '有効'}
                    </span>
                    <span className="text-yellow-600 font-bold text-sm">
                      {coupon.discountType === 'percent'
                        ? coupon.discountValue + '% OFF'
                        : coupon.discountValue.toLocaleString() + '円 OFF'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600 space-y-1 mb-3">
                  <p>コード: <span className="font-mono font-bold">{coupon.code}</span></p>
                  <p>期間: {coupon.validFrom} 〜 {coupon.validUntil}</p>
                </div>
                <div className="flex gap-2 border-t pt-3">
                  <button
                    onClick={() => handleEdit(coupon)}
                    className="flex-1 border border-blue-600 text-blue-600 rounded-lg py-2 text-sm font-bold"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleToggleActive(coupon)}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold border ${
                      coupon.isActive
                        ? 'border-gray-300 text-gray-600'
                        : 'border-green-500 text-green-600'
                    }`}
                  >
                    {coupon.isActive ? '無効にする' : '有効にする'}
                  </button>
                  <button
                    onClick={() => handleDelete(coupon.id)}
                    className="flex-1 border border-red-400 text-red-400 rounded-lg py-2 text-sm font-bold"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}