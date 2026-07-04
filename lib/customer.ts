import { db } from './firebase';
import {
  doc, getDoc, setDoc, updateDoc, increment,
  collection, addDoc
} from 'firebase/firestore';

export type Customer = {
  lineUserId: string;
  name: string;
  phone: string;
  email: string;
  points?: number;
  createdAt: Date;
  updatedAt: Date;
};

// 顧客情報を取得
export const getCustomer = async (lineUserId: string): Promise<Customer | null> => {
  try {
    const ref = doc(db, 'customers', lineUserId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as Customer;
    }
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// 顧客情報を保存・更新
export const saveCustomer = async (customer: Omit<Customer, 'createdAt' | 'updatedAt'>) => {
  try {
    const ref = doc(db, 'customers', customer.lineUserId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      // 既存顧客は更新
      await updateDoc(ref, {
        ...customer,
        updatedAt: new Date(),
      });
    } else {
      // 新規顧客は作成（ポイントは0からスタート）
      await setDoc(ref, {
        ...customer,
        points: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (e) {
    console.error(e);
  }
};

// 支払金額に応じてポイントを付与する（100円ごとに1ポイント）
// bookingId を渡すと、付与履歴も 'pointsHistory' サブコレクションに記録される
export const addPointsForPayment = async (
  lineUserId: string,
  paidAmount: number,
  bookingId?: string
): Promise<number> => {
  const earnedPoints = Math.floor(paidAmount / 100);

  const ref = doc(db, 'customers', lineUserId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, {
      points: increment(earnedPoints),
      updatedAt: new Date(),
    });
  } else {
    // 万が一顧客レコードが無ければ作成
    await setDoc(ref, {
      lineUserId,
      name: '',
      phone: '',
      email: '',
      points: earnedPoints,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 付与履歴を記録
  try {
    await addDoc(collection(db, 'customers', lineUserId, 'pointsHistory'), {
      type: 'earn',
      paidAmount,
      earnedPoints,
      bookingId: bookingId || null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('ポイント履歴の記録に失敗:', e);
  }

  return earnedPoints;
};