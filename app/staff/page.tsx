'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import liff from '@line/liff';
import BookingSteps from '@/components/BookingSteps';
import StaffPickerWidget, { Staff } from '@/components/StaffPickerWidget';

type BookingRecord = {
  lineUserId: string;
  staffId?: string;
  status: string;
  createdAt: any;
};

const parsePriceToNumber = (priceStr: string): number => {
  const digits = priceStr.replace(/[^0-9]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

function StaffSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salonId = searchParams.get('salonId') || '';
  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';

  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [previousStaffId, setPreviousStaffId] = useState('');

  useEffect(() => {
    const fetchPreviousStaff = async () => {
      try {
        // ローカルホストでのテスト時はLIFF初期化をスキップ
        const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        
        if (!isLocalhost) {
          await liff.init({ liffId: '2010454791-miMuAYxd' });
          if (!liff.isLoggedIn()) return;
          const profile = await liff.getProfile();

          const q = query(
            collection(db, 'bookings'),
            where('lineUserId', '==', profile.userId),
            where('status', '==', 'confirmed')
          );
          const snapshot = await getDocs(q);
          const records = snapshot.docs.map(d => d.data() as BookingRecord);
          if (records.length === 0) return;

          records.sort((a, b) => {
            const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return bt - at;
          });
          const latest = records.find(r => r.staffId);
          if (latest?.staffId) {
            setPreviousStaffId(latest.staffId);
            setSelectedStaffId(latest.staffId);
          }
        }
      } catch (e) {
        console.log('前回担当の取得に失敗:', e);
      }
    };
    fetchPreviousStaff();
  }, []);

  const nominationFee = selectedStaff?.nominationFee || 0;
  const totalPrice = parsePriceToNumber(price) + nominationFee;

  const handleNext = () => {
    const staffName = selectedStaff ? selectedStaff.name : 'お任せ';
    const finalPrice = `¥${totalPrice.toLocaleString()}`;
    router.push(
      `/booking?salonId=${salonId}&menu=${menu}&time=${time}&price=${encodeURIComponent(finalPrice)}&staffId=${selectedStaffId}&staffName=${encodeURIComponent(staffName)}&nominationFee=${nominationFee}`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2 cursor-pointer">← 戻る</button>
        <h1 className="text-xl font-bold">スタイリストを指名</h1>
        <p className="text-sm mt-1">{menu} / {time} / {price}</p>
      </div>

      <BookingSteps current={2} />

      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          担当を指名する場合は選択してください（未選択の場合は「指名なし」で進みます）
        </p>

        <StaffPickerWidget
          selectedStaffId={selectedStaffId}
          onChange={(staffId, staff) => { setSelectedStaffId(staffId); setSelectedStaff(staff); }}
          previousStaffId={previousStaffId}
          salonId={salonId || undefined}
        />

        {nominationFee > 0 && (
          <div className="bg-yellow-50 rounded-xl p-3 mb-4 text-sm text-center">
            メニュー料金 {price} ＋ 指名料 ¥{nominationFee.toLocaleString()} ＝
            <span className="font-bold text-orange-600"> ¥{totalPrice.toLocaleString()}</span>
          </div>
        )}

        <button
          onClick={handleNext}
          className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg cursor-pointer"
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