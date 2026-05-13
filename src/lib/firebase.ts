import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

let firebaseApp: any = null;
let firebaseAuthInstance: Auth | null = null;

export const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;

  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

  if (missingKeys.length > 0) {
    console.error('[Firebase] Missing client environment variables:', missingKeys.join(', '));
    console.error('[Firebase] Add them to FE/agri-ecommerce1/.env and restart Next.js.');
    throw new Error(`Missing Firebase client environment variables: ${missingKeys.join(', ')}`);
  }

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig as any);
  } else {
    firebaseApp = getApp();
  }

  return firebaseApp;
};

export const firebaseAuth = (): Auth => {
  if (firebaseAuthInstance) return firebaseAuthInstance;
  
  try {
    const app = getFirebaseApp();
    firebaseAuthInstance = getAuth(app);
    return firebaseAuthInstance;
  } catch (error) {
    console.error('[Firebase Auth] Failed to initialize:', error);
    throw error;
  }
};