'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import liff from '@line/liff';
import { getCustomer, saveCustomer } from '@/lib/customer';

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

  const [lineUserId, setLineUserId] = useState('temp-user');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const init = async () => {
      let uid = 'temp-user';
      try {
        await liff.init({ liffId: '2010454791-miMuAYxd' });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          uid = profile.userId;
          setLineUserId(uid);
        }
      } catch (e) {
        console.log('LIFF初期化エラー:', e);
      }

      // 既存顧客チェック
      const customer = await getCustomer(uid);
      if (customer) {
        // 登録済みの場合は入力画面をスキップして確認画面へ
        router.replace(
          `/confirm?menu=${menu}&time=${time}&price=${price}&date=${date}&slot=${slot}&staffId=${staffId}&staffName=${encodeURIComponent(staffName)}&name=${encodeURIComponent(customer.name)}&phone=${encodeURIComponent(customer.phone)}&email=${encodeURIComponent(customer.email || '')}&lineUserId=${uid}`
        );
        return;
      }
      setLoading(false);
    };
    init();
  }, []);

  const validate = () => {
    const newErrors: {[key: string]: string} = {};
    if (!name) newErrors.name = '名前を入力してください';
    if (!phone) newErrors.phone = '電話番号を入力してください';
    else if (!/^[0-9]{10,11}$/.test(phone.replace(/-/g, '')))
      newErrors.phone = '正しい電話番号を入力してください';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = '正しいメールアドレスを入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) return;

    // 顧客情報をFirestoreに保存
    await saveCustomer({
      lineUserId,
      name,
      phone,
      email,
    });

    router.push(
      `/confirm?menu=${menu}&time=${time}&price=${price}&date=${date}&slot=${slot}&staffId=${staffId}&staffName=${encodeURIComponent(staffName)}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}&lineUserId=${lineUserId}`
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-600 text-white p-6">
        <button onClick={() => router.back()} className="text-sm mb-2">← 戻る</button>
        <h1 className="text-xl font-bold">お客様情報の入力</h1>
        <p className="text-sm mt-1 text-blue-100">初回のみ入力が必要です</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow p-4">

          {/* 名前 */}
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

          {/* 電話番号 */}
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

          {/* メールアドレス */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              メールアドレス <span className="text-gray-400 text-xs">任意</span>
            </label>
            <input
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded-lg p-3 text-base"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
        </div>

        <button
          onClick={handleNext}
          className="w-full bg-blue-600 text-white rounded-xl p-4 font-bold text-lg"
        >
          次へ（予約確認）
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
