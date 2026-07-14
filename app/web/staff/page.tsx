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
  career: string;
  title: string;
  yearsOfExperience: number;
  nominationFee: number;
};

const parsePriceToNumber = (priceStr: string): number => {
  const digits = priceStr.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
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
  const [showFullCareer, setShowFullCareer] = useState(false);

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

  const selectedStaff = staffList.find(s => s.id === selectedStaffId) || null;
  const nominationFee = selectedStaff?.nominationFee || 0;
  const totalPrice = parsePriceToNumber(price) + nominationFee;

  const handleNext = () => {
    const staffName = selectedStaff ? selectedStaff.name : 'お任せ';
    const finalPrice = `¥${totalPrice.toLocaleString()}`;
    router.push(
      `/web/booking?menu=${menu}&time=${time}&price=${encodeURIComponent(finalPrice)}&staffId=${selectedStaffId}&staffName=${encodeURIComponent(staffName)}&nominationFee=${nominationFee}`
    );
  };

  return (
    <div>
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
        <h1 className="text-xl font-bold">スタイリストを指名</h1>
        <p className="text-sm mt-1">{menu} / {time} / {price}</p>
      </div>

      <BookingSteps current={2} />

      <div className="p-4">
        {loading ? (
          <p className="text-center text-gray-400 py-12">読み込み中...</p>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              <button
                onClick={() => { setSelectedStaffId(''); setShowFullCareer(false); }}
                className={`shrink-0 px-4 py-3 rounded-full border-2 font-bold text-sm ${
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
                  onClick={() => { setSelectedStaffId(staff.id); setShowFullCareer(false); }}
                  className={`shrink-0 px-4 py-3 rounded-full border-2 font-bold text-sm ${
                    selectedStaffId === staff.id
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-200 bg-white text-gray-600'
                  }`}
                >
                  {staff.name}
                </button>
              ))}
            </div>

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

                {selectedStaff.bio && (
                  <p className="text-sm text-gray-600 mt-3">{selectedStaff.bio}</p>
                )}

                {selectedStaff.career && (
                  <div className="mt-2">
                    {showFullCareer ? (
                      <>
                        <p className="text-sm text-gray-500 whitespace-pre-wrap">{selectedStaff.career}</p>
                        <button onClick={() => setShowFullCareer(false)} className="text-xs text-blue-600 font-bold mt-1">
                          閉じる
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setShowFullCareer(true)} className="text-xs text-blue-600 font-bold underline">
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
          </>
        )}

        {nominationFee > 0 && (
          <div className="bg-yellow-50 rounded-xl p-3 mb-4 text-sm text-center">
            メニュー料金 {price} ＋ 指名料 ¥{nominationFee.toLocaleString()} ＝
            <span className="font-bold text-orange-600"> ¥{totalPrice.toLocaleString()}</span>
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