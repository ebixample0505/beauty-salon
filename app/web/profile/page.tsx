'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { saveCustomer } from '@/lib/customer';
import BookingSteps from '@/components/BookingSteps';

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const menu = searchParams.get('menu') || '';
  const time = searchParams.get('time') || '';
  const price = searchParams.get('price') || '';
  const date = searchParams.get('date') || '';
  const slot = searchParams.get('slot') || '';
  const staffId = searchParams.get('staffId') || '';
  const staffName = searchParams.get('staffName') || 'お任せ';
  const nominationFee = searchParams.get('nominationFee') || '0';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!name) newErrors.name = '名前を入力してください';
    if (!phone) newErrors.phone = '電話番号を入力してください';
    else if (!/^[0-9]{10,11}$/.test(phone.replace(/-/g, '')))
      newErrors.phone = '正しい電話番号を入力してください';
    if (!email) newErrors.email = 'メールアドレスを入力してください（予約確認をお送りします）';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = '正しいメールアドレスを入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;
    setSubmitting(true);

    // Web経由のお客様は、電話番号をベースにした識別子で管理する
    const webUserId = `web-${phone.replace(/-/g, '')}`;

    try {
      await saveCustomer({ lineUserId: webUserId, name, phone, email });

      router.push(
        `/web/confirm?menu=${menu}&time=${time}&price=${price}&date=${date}&slot=${slot}&staffId=${staffId}&staffName=${encodeURIComponent(staffName)}&nominationFee=${nominationFee}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&webUserId=${webUserId}`
      );
    } catch (e) {
      console.error(e);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
        <h1 className="text-xl font-bold">お客様情報の入力</h1>
        <p className="text-sm mt-1 text-blue-100">予約確認メールをお送りします</p>
      </div>

      <BookingSteps current={4} />

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              お名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="山田 太郎"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded-lg p-3 text-base"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="09012345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border rounded-lg p-3 text-base"
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3 text-base"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            <p className="text-xs text-gray-400 mt-1">予約内容の確認メールをお送りします</p>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg disabled:opacity-50"
        >
          {submitting ? '処理中...' : '次へ（予約確認）'}
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  );
}