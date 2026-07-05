'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import BookingSteps from '@/components/BookingSteps';

type Staff = {
  id: string;
  name: string;
  photoUrl: string;
  bio: string;
};

function StaffSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const q = query(collection(db, 'staff'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const data = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }) as Staff & { order?: number })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setStaffList(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const handleNext = () => {
    const staff = staffList.find(s => s.id === selectedStaffId);
    const staffName = staff ? staff.name : 'お任せ';
    router.push(
      `/booking?menu=${menu}&time=${time}&price=${price}&staffId=${selectedStaffId}&staffName=${encodeURIComponent(staffName)}`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
        <h1 className="text-xl font-bold">スタイリストを指名</h1>
        <p className="text-sm mt-1">{menu} / {time} / {price}</p>
      </div>

      <BookingSteps current={2} />

      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          担当を指名する場合は選択してください（未選択の場合は「指名なし」で進みます）
        </p>

        {loading ? (
          <p className="text-center text-gray-400 py-12">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {/* お任せ */}
            <button
              onClick={() => setSelectedStaffId('')}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 ${
                selectedStaffId === ''
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                お任せ
              </div>
              <span className="text-xs font-bold text-gray-700">指名なし</span>
            </button>

            {staffList.map(staff => (
              <button
                key={staff.id}
                onClick={() => setSelectedStaffId(staff.id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 ${
                  selectedStaffId === staff.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {staff.photoUrl ? (
                  <img
                    src={staff.photoUrl}
                    alt={staff.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200" />
                )}
                <span className="text-xs font-bold text-gray-700">{staff.name}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleNext}
          className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg"
        >
          次へ（日時を選択）
        </button>
      </div>
    </div>
  );
}

export default function StaffSelectPage() {
  return (
    <Suspense>
      <StaffSelectContent />
    </Suspense>
  );
}