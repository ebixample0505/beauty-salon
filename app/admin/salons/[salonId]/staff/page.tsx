'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db, storage } from '@/lib/firebase';
import {
  collection, getDocs, addDoc,
  updateDoc, doc, deleteDoc, orderBy, query, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { requireAdminAuth } from '@/lib/adminAuth';
import AdminHeader from '@/components/AdminHeader';

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];

type DaySchedule = {
  isOff: boolean;
  startTime: string;
  endTime: string;
};

type Staff = {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  specialties: string[];
  career: string;
  title: string;
  yearsOfExperience: number;
  nominationFee: number;
  schedule: DaySchedule[];
  isActive: boolean;
  order: number;
};

const defaultSchedule = (): DaySchedule[] =>
  DAYS.map((_, i) => ({ isOff: i === 1, startTime: '10:00', endTime: '19:00' }));

const emptyForm = {
  name: '',
  photoUrl: '',
  bio: '',
  specialtiesText: '',
  career: '',
  title: '',
  yearsOfExperience: 0,
  nominationFee: 0,
  schedule: defaultSchedule(),
  isActive: true,
  order: 0,
};

export default function AdminSalonStaffPage() {
  const router = useRouter();
  const params = useParams();
  const salonId = params.salonId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [salonName, setSalonName] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!requireAdminAuth(router)) return;
    fetchSalonName();
    fetchStaff();
  }, [salonId]);

  const fetchSalonName = async () => {
    try {
      const snap = await getDoc(doc(db, 'salons', salonId));
      if (snap.exists()) setSalonName((snap.data() as { name: string }).name);
    } catch { /* ignore */ }
  };

  const fetchStaff = async () => {
    try {
      const q = query(collection(db, 'salons', salonId, 'staff'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Staff);
      setStaffList(data);
    } catch {
      const snapshot = await getDocs(collection(db, 'salons', salonId, 'staff'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Staff);
      setStaffList(data);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm, order: staffList.length, schedule: defaultSchedule() });
    setEditStaff(null);
    setShowForm(false);
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (staff: Staff) => {
    setForm({
      name: staff.name,
      photoUrl: staff.photoUrl,
      bio: staff.bio,
      specialtiesText: (staff.specialties || []).join(', '),
      career: staff.career,
      title: staff.title || '',
      yearsOfExperience: staff.yearsOfExperience || 0,
      nominationFee: staff.nominationFee || 0,
      schedule: staff.schedule?.length === 7 ? staff.schedule : defaultSchedule(),
      isActive: staff.isActive,
      order: staff.order,
    });
    setEditStaff(staff);
    setPhotoPreview(staff.photoUrl || '');
    setPhotoFile(null);
    setShowForm(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateDaySchedule = (index: number, field: keyof DaySchedule, value: string | boolean) => {
    const s = [...form.schedule];
    s[index] = { ...s[index], [field]: value };
    setForm({ ...form, schedule: s });
  };

  const handleSubmit = async () => {
    if (!form.name) { alert('スタッフ名は必須です'); return; }
    setSaving(true);
    try {
      const specialties = form.specialtiesText.split(',').map(s => s.trim()).filter(Boolean);
      const dataToSave = {
        name: form.name,
        bio: form.bio,
        specialties,
        career: form.career,
        title: form.title,
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        nominationFee: Number(form.nominationFee) || 0,
        schedule: form.schedule,
        isActive: form.isActive,
        order: form.order,
      };

      let staffId = editStaff?.id;
      const staffColRef = collection(db, 'salons', salonId, 'staff');

      if (editStaff) {
        await updateDoc(doc(db, 'salons', salonId, 'staff', editStaff.id), dataToSave);
      } else {
        const docRef = await addDoc(staffColRef, { ...dataToSave, photoUrl: '', order: staffList.length, createdAt: new Date() });
        staffId = docRef.id;
      }

      if (photoFile && staffId) {
        const storageRef = ref(storage, `salons/${salonId}/staff/${staffId}.jpg`);
        await uploadBytes(storageRef, photoFile);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, 'salons', salonId, 'staff', staffId), { photoUrl: url });
      }

      alert(editStaff ? 'スタッフ情報を更新しました' : 'スタッフを登録しました');
      resetForm();
      fetchStaff();
    } catch (error) {
      alert('エラーが発生しました: ' + String(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (staff: Staff) => {
    await updateDoc(doc(db, 'salons', salonId, 'staff', staff.id), { isActive: !staff.isActive });
    fetchStaff();
  };

  const handleDelete = async (staff: Staff) => {
    if (!confirm(`${staff.name}さんを削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, 'salons', salonId, 'staff', staff.id));
      if (staff.photoUrl) {
        try { await deleteObject(ref(storage, `salons/${salonId}/staff/${staff.id}.jpg`)); } catch { /* ignore */ }
      }
      fetchStaff();
    } catch (error) {
      alert('削除に失敗しました: ' + String(error));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader
        title="スタッフ管理"
        subtitle={salonName ? `${salonName} ・ ${staffList.length}名` : `${staffList.length}名登録`}
        currentPath="/admin/salons"
      />

      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <button
          onClick={() => router.push('/admin/salons')}
          className="text-sm text-blue-600 font-bold cursor-pointer"
        >
          ← 店舗一覧に戻る
        </button>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm"
        >
          + 新規登録
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div className="m-4 bg-white rounded-xl shadow p-4">
          <h2 className="font-bold mb-4 text-lg">
            {editStaff ? 'スタッフ情報を編集' : '新規スタッフ登録'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700">顔写真</label>
              <div className="flex items-center gap-3 mt-1">
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-20 h-20 rounded-full object-cover border" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">未設定</div>
                )}
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg"
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
              <label className="text-sm font-bold text-gray-700">名前 <span className="text-red-500">*</span></label>
              <input type="text" placeholder="例：山田 花子" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg p-2 mt-1" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">一言コメント</label>
              <input type="text" placeholder="例：お客様の理想を叶えます！" value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                className="w-full border rounded-lg p-2 mt-1" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">得意メニュー（カンマ区切り）</label>
              <input type="text" placeholder="例：カラー, パーマ" value={form.specialtiesText}
                onChange={e => setForm({ ...form, specialtiesText: e.target.value })}
                className="w-full border rounded-lg p-2 mt-1" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">役職</label>
                <input type="text" placeholder="例：ヘアデザイナー" value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg p-2 mt-1" />
              </div>
              <div className="w-24">
                <label className="text-sm font-bold text-gray-700">経験年数</label>
                <input type="number" min={0} value={form.yearsOfExperience}
                  onChange={e => setForm({ ...form, yearsOfExperience: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">指名料（円）</label>
              <input type="number" min={0} placeholder="0" value={form.nominationFee}
                onChange={e => setForm({ ...form, nominationFee: Number(e.target.value) })}
                className="w-full border rounded-lg p-2 mt-1" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">経歴</label>
              <textarea placeholder="例：美容師歴10年。○○サロン勤務を経て入社。" value={form.career}
                onChange={e => setForm({ ...form, career: e.target.value })}
                rows={3} className="w-full border rounded-lg p-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700 block mb-2">勤務スケジュール</label>
              <div className="space-y-2">
                {DAYS.map((day, i) => (
                  <div key={day} className="flex items-center gap-2 border rounded-lg p-2">
                    <span className="w-6 font-bold text-sm">{day}</span>
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={form.schedule[i].isOff}
                        onChange={e => updateDaySchedule(i, 'isOff', e.target.checked)} />
                      休み
                    </label>
                    {!form.schedule[i].isOff && (
                      <>
                        <input type="time" value={form.schedule[i].startTime}
                          onChange={e => updateDaySchedule(i, 'startTime', e.target.value)}
                          className="border rounded p-1 text-xs" />
                        <span className="text-xs">〜</span>
                        <input type="time" value={form.schedule[i].endTime}
                          onChange={e => updateDaySchedule(i, 'endTime', e.target.value)}
                          className="border rounded p-1 text-xs" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-700">表示順</label>
                <input type="number" value={form.order}
                  onChange={e => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4" />
              <label htmlFor="isActive" className="text-sm font-bold text-gray-700">公開する</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-bold disabled:opacity-50">
                {saving ? '保存中...' : editStaff ? '更新する' : '登録する'}
              </button>
              <button onClick={resetForm}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-3 font-bold">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スタッフ一覧 */}
      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-center text-gray-500 py-12">読み込み中...</p>
        ) : staffList.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">スタッフが登録されていません</p>
            <button onClick={() => setShowForm(true)}
              className="mt-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">
              最初のスタッフを登録する
            </button>
          </div>
        ) : (
          staffList.map(staff => (
            <div key={staff.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start gap-3">
                {staff.photoUrl ? (
                  <img src={staff.photoUrl} alt={staff.name} className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">未設定</div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg">{staff.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      staff.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {staff.isActive ? '公開中' : '非公開'}
                    </span>
                  </div>
                  {staff.bio && <p className="text-sm text-gray-500 mt-1">{staff.bio}</p>}
                  {staff.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {staff.specialties.map((s, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 border-t pt-3 mt-3">
                <button onClick={() => handleEdit(staff)}
                  className="flex-1 border border-blue-600 text-blue-600 rounded-lg py-2 text-sm font-bold">
                  編集
                </button>
                <button onClick={() => handleToggleActive(staff)}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold border ${
                    staff.isActive ? 'border-gray-300 text-gray-600' : 'border-green-500 text-green-600'
                  }`}>
                  {staff.isActive ? '非公開にする' : '公開する'}
                </button>
                <button onClick={() => handleDelete(staff)}
                  className="flex-1 border border-red-400 text-red-400 rounded-lg py-2 text-sm font-bold">
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
