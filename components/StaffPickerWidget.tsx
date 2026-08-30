'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export type Staff = {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
  career: string;
  title: string;
  yearsOfExperience: number;
  nominationFee: number;
};

type Props = {
  selectedStaffId: string; // ''=お任せ
  onChange: (staffId: string, staff: Staff | null) => void;
  previousStaffId?: string; // 「前回担当」バッジを出す場合に指定（LINE版のみ利用）
  salonId?: string; // 指定時はサロンのサブコレクションからスタッフを取得
};

export default function StaffPickerWidget({ selectedStaffId, onChange, previousStaffId, salonId }: Props) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullCareer, setShowFullCareer] = useState(false);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const staffCollection = salonId
          ? collection(db, 'salons', salonId, 'staff')
          : collection(db, 'staff');
        const q = query(staffCollection, where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Staff & { order?: number })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setStaffList(data);
      } catch (e) {
        console.error('スタッフ取得エラー:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [salonId]);

  const selectedStaff = staffList.find(s => s.id === selectedStaffId) || null;
  const nominationFee = selectedStaff?.nominationFee || 0;

  const handleSelect = (staffId: string) => {
    setShowFullCareer(false);
    const staff = staffList.find(s => s.id === staffId) || null;
    onChange(staffId, staff);
  };

  if (loading) {
    return <p className="text-center text-gray-400 py-12">読み込み中...</p>;
  }

  return (
    <div>
      {/* 横スクロールの選択バー */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => handleSelect('')}
          className={`shrink-0 px-4 py-3 rounded-full border-2 font-bold text-sm cursor-pointer ${
            selectedStaffId === ''
              ? 'border-blue-600 bg-blue-50 text-blue-600'
              : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          指名なし
        </button>
        {staffList.map(staff => (
          <button
            key={staff.id}
            onClick={() => handleSelect(staff.id)}
            className={`shrink-0 px-4 py-3 rounded-full border-2 font-bold text-sm flex items-center gap-1 cursor-pointer ${
              selectedStaffId === staff.id
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            {previousStaffId === staff.id && (
              <span className="text-[10px] bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">
                ✓前回
              </span>
            )}
            {staff.name}
          </button>
        ))}
      </div>

      {/* 詳細パネル */}
      {selectedStaff ? (
        <div className="bg-white rounded-xl shadow p-4 mb-8">
          <div className="flex gap-4">
            {selectedStaff.photoUrl ? (
              <img
                src={selectedStaff.photoUrl}
                alt={selectedStaff.name}
                className="w-20 h-20 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />
            )}
            <div className="flex-1">
              {previousStaffId === selectedStaff.id && (
                <span className="inline-block text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-bold mb-1">
                  前回担当
                </span>
              )}
              <h2 className="font-bold text-lg">{selectedStaff.name}</h2>
              <p className="text-sm text-gray-500">
                指名料：
                <span className={`font-bold ${nominationFee > 0 ? 'text-red-500' : 'text-gray-600'}`}>
                  {nominationFee > 0 ? `¥${nominationFee.toLocaleString()}` : '¥0'}
                </span>
              </p>
              {(selectedStaff.title || selectedStaff.yearsOfExperience > 0) && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedStaff.title}
                  {selectedStaff.yearsOfExperience > 0 && `（歴${selectedStaff.yearsOfExperience}年）`}
                </p>
              )}
            </div>
          </div>

          {selectedStaff.bio && <p className="text-sm text-gray-600 mt-3">{selectedStaff.bio}</p>}

          {selectedStaff.career && (
            <div className="mt-2">
              {showFullCareer ? (
                <>
                  <p className="text-sm text-gray-500 whitespace-pre-wrap">{selectedStaff.career}</p>
                  <button onClick={() => setShowFullCareer(false)} className="text-xs text-blue-600 font-bold mt-1 cursor-pointer">
                    閉じる
                  </button>
                </>
              ) : (
                <button onClick={() => setShowFullCareer(true)} className="text-xs text-blue-600 font-bold underline cursor-pointer">
                  詳細を見る
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-4 mb-8 text-sm text-gray-500 text-center">
          空いているスタッフの中からおまかせで担当します
        </div>
      )}
    </div>
  );
}