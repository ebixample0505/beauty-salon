import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA4qiEaMPJcEduWw4xeBlA7uTJOsuMBYZg",
  authDomain: "dental-clinic-app-433f7.firebaseapp.com",
  projectId: "dental-clinic-app-433f7",
  storageBucket: "dental-clinic-app-433f7.firebasestorage.app",
  messagingSenderId: "930459370511",
  appId: "1:930459370511:web:a752a96521bf2f1dd54f7a",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const storage = getStorage(app);