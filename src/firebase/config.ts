import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB1Iy1ol933xhziISyG3BAFoLdfUDFqQLg",
  authDomain: "e-amaranx.firebaseapp.com",
  projectId: "e-amaranx",
  storageBucket: "e-amaranx.firebasestorage.app",
  messagingSenderId: "257136272002",
  appId: "1:257136272002:web:ca4b64f5e6fe81294dca9b",
  measurementId: "G-PR1J17EPW5"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  }
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection: offline or not yet reachable.');
    }
  }
}

// Run connection check non-blockingly
testConnection().catch(() => {});
