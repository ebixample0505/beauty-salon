'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import {
  collection, getDocs, addDoc,
  updateDoc, doc, deleteDoc, orderBy, query
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { requireAdminAuth } from '@/lib/adminAuth';
import AdminHeader from '@/components/AdminHeader';

const AREA_OPTIONS = ['渋谷', '新宿', '銀座', '表参道', '池袋', '原宿', '恵比寿', '六本木', '上野', 'その他'];
const GENRE_OPTIONS = ['カット', 'カラー', 'パーマ', 'トリートメント', 'ヘッドスパ', '縮毛矯正', 'ブリーチ', 'ヘアセット'];

type Salon = {
  id: string;
  name: string;
  catchCopy: string;
  description: string;
  address: string;
  area: string;
  genres: string[];
  imageUrl: string;
  rating: number;
  reviewCount: number;
  openHours: string;
  closedDays: string;
  phone: string;
  isActive: boolean;
  order: number;
};

const emptyForm = {
  name: '',
  catchCopy: '',
  description: '',
  address: '',
  area: '',
  genres: [] as string[],
  imageUrl: '',
  rating: 0,
  reviewCount: 0,
  openHours: '',
  closedDays: '',
  phone: '',
  isActive: true,
  order: 0,
};

export default function AdminSalonsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSalon, setEditSalon] = useState<Salon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!requireAdminAuth(router)) return;
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    try {
      const q = query(collection(db, 'salons'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Salon);
      setSalons(data);
    } catch {
      // orderフィールドがない場合はそのまま取得
      const snapshot = await getDocs(collection(db, 'salons'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Salon);
      setSalons(data);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm, order: salons.length });
    setEditSalon(null);
    setShowForm(false);
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (salon: Salon) => {
    setForm({
      name: salon.name || '',
      catchCopy: salon.catchCopy || '',
      description: salon.description || '',
      address: salon.address || '',
      area: salon.area || '',
      genres: salon.genres || [],
      imageUrl: salon.imageUrl || '',
      rating: salon.rating || 0,
      reviewCount: salon.reviewCount || 0,
      openHours: salon.openHours || '',
      closedDays: salon.closedDays || '',
      phone: salon.phone || '',
      isActive: salon.isActive ?? true,
      order: salon.order ?? 0,
    });
    setEditSalon(salon);
    setPhotoPreview(salon.imageUrl || '');
    setPhotoFile(null);
    setShowForm(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleGenre = (genre: string) => {
    setForm(f => ({
      ...f,
      genres: f.genres.includes(genre)
        ? f.genres.filter(g => g !== genre)
        : [...f.genres, genre],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name) { alert('店舗名は必須です'); return; }
    setSaving(true);
    try {
      const dataToSave = {
        name: form.name,
        catchCopy: form.catchCopy,
        description: form.description,
        address: form.address,
        area: form.area,
        genres: form.genres,
        rating: Number(form.rating) || 0,
        reviewCount: Number(form.reviewCount) || 0,
        openHours: form.openHours,
        closedDays: form.closedDays,
        phone: form.phone,
        isActive: form.isActive,
        order: Number(form.order) || 0,
      };

      let salonId = editSalon?.id;

      if (editSalon) {
        await updateDoc(doc(db, 'salons', editSalon.id), dataToSave);
      } else {
        const docRef = await addDoc(collection(db, 'salons'), {
          ...dataToSave,
          imageUrl: '',
          createdAt: new Date(),
        });
        salonId = docRef.id;
      }

      if (photoFile && salonId) {
        const storageRef = ref(storage, `salons/${salonId}.jpg`);
        await uploadBytes(storageRef, photoFile);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, 'salons', salonId), { imageUrl: url });
      }

      alert(editSalon ? '店舗情報を更新しました' : '店舗を登録しました');
      resetForm();
      fetchSalons();
    } catch (error) {
      alert('エラーが発生しました: ' + String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (salon: Salon) => {
    await updateDoc(doc(db, 'salons', salon.id), { isActive: !salon.isActive });
    fetchSalons();
  };

  const handleDelete = async (salon: Salon) => {
    if (!confirm(`「${salon.name}」を削除しますか？\nスタッフ・メニューのサブコレクションは別途削除が必要です。`)) return;
    try {
      await deleteDoc(doc(db, 'salons', salon.id));
      if (salon.imageUrl) {
        try { await deleteObject(ref(storage, `salons/${salon.id}.jpg`)); } catch { /* ignore */ }
      }
      fetchSalons();
    } catch (error) {
      alert('削除に失敗しました: ' + String(error));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader title="店舗管理" subtitle={`${salons.length}件登録`} currentPath="/admin/salons" />

      <div className="bg-white px-4 py-3 flex justify-end border-b">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          + 新規店舗を登録
        </button>
      </div>

      {/* 登録・編集フォーム */}
      {showForm && (
        <div className="m-4 bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-4 text-lg">
            {editSalon ? '店舗情報を編集' : '新規店舗登録'}
          </h2>
          <div className="space-y-4">

            {/* メイン画像 */}
            <div>
              <label className="text-sm font-bold text-gray-700">メイン画像</label>
              <div className="mt-1 space-y-2">
                {photoPreview && (
                  <img src={photoPreview} alt="preview" className="w-full h-36 object-cover rounded-lg border" />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    setPhotoFile(file);
                    if (file) setPhotoPreview(URL.createObjectURL(file));
                  }}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                店舗名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="例：渋谷本店"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">キャッチコピー</label>
              <input
                type="text"
                placeholder="例：あなたの魅力を最大限に引き出します"
                value={form.catchCopy}
                onChange={e => setForm({ ...form, catchCopy: e.target.value })}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">サロン紹介文</label>
              <textarea
                placeholder="サロンの特徴やこだわりを記入してください"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full border rounded-lg p-2 mt-1 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">住所</label>
              <input
                type="text"
                placeholder="例：東京都渋谷区渋谷1-1-1"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border rounded-lg p-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">エリア</label>
              <div className="flex flex-wrap gap-2">
                {AREA_OPTIONS.map(area => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setForm({ ...form, area })}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold border cursor-pointer ${
                      form.area === area
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700 block mb-1">対応ジャンル（複数可）</label>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold border cursor-pointer ${
                      form.genres.includes(genre)
                        ? 'bg-pink-500 text-white border-pink-500'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">営業時間</label>
                <input
                  type="text"
                  placeholder="例：10:00〜20:00"
                  value={form.openHours}
                  onChange={e => setForm({ ...form, openHours: e.target.value })}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">定休日</label>
                <input
                  type="text"
                  placeholder="例：毎週火曜日"
                  value={form.closedDays}
                  onChange={e => setForm({ ...form, closedDays: e.target.value })}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">電話番号</label>
                <input
                  type="tel"
                  placeholder="例：03-0000-0000"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
              <div className="w-24">
                <label className="text-sm font-bold text-gray-700">表示順</label>
                <input
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={e => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">評価（0〜5）</label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={form.rating}
                  onChange={e => setForm({ ...form, rating: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">クチコミ件数</label>
                <input
                  type="number"
                  min={0}
                  value={form.reviewCount}
                  onChange={e => setForm({ ...form, reviewCount: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isActive" className="text-sm font-bold text-gray-700">
                公開する（お客様の店舗一覧に表示されます）
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-bold disabled:opacity-50"
              >
                {saving ? '保存中...' : editSalon ? '更新する' : '登録する'}
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

      {/* 店舗一覧 */}
      <div className="p-4 space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 py-12">読み込み中...</p>
        ) : salons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">✂</p>
            <p>店舗が登録されていません</p>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold"
            >
              最初の店舗を登録する
            </button>
          </div>
        ) : (
          salons.map(salon => (
            <div key={salon.id} className="bg-white rounded-xl shadow overflow-hidden">
              {salon.imageUrl && (
                <img src={salon.imageUrl} alt={salon.name} className="w-full h-32 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{salon.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        salon.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {salon.isActive ? '公開中' : '非公開'}
                      </span>
                    </div>
                    {salon.catchCopy && <p className="text-sm text-gray-500 mt-0.5">{salon.catchCopy}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {salon.area && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{salon.area}</span>
                  )}
                  {(salon.genres || []).map(g => (
                    <span key={g} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{g}</span>
                  ))}
                </div>

                {salon.address && (
                  <p className="text-xs text-gray-500 mt-2">📍 {salon.address}</p>
                )}

                {/* スタッフ・メニュー管理へのリンク */}
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <button
                    onClick={() => router.push(`/admin/salons/${salon.id}/staff`)}
                    className="flex-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg py-2 text-xs font-bold cursor-pointer"
                  >
                    👤 スタッフ管理
                  </button>
                  <button
                    onClick={() => router.push(`/admin/salons/${salon.id}/menus`)}
                    className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-2 text-xs font-bold cursor-pointer"
                  >
                    📋 メニュー管理
                  </button>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(salon)}
                    className="flex-1 border border-blue-600 text-blue-600 rounded-lg py-2 text-sm font-bold cursor-pointer"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleToggleActive(salon)}
                    className={`flex-1 rounded-lg py-2 text-sm font-bold border cursor-pointer ${
                      salon.isActive ? 'border-gray-300 text-gray-600' : 'border-green-500 text-green-600'
                    }`}
                  >
                    {salon.isActive ? '非公開にする' : '公開する'}
                  </button>
                  <button
                    onClick={() => handleDelete(salon)}
                    className="flex-1 border border-red-400 text-red-400 rounded-lg py-2 text-sm font-bold cursor-pointer"
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
