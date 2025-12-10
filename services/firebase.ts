
import * as firebaseAppModule from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  Firestore
} from 'firebase/firestore';
import { WorldData } from '../types';

// Workaround for TypeScript errors where named exports are not detected in firebase/app
// due to environment configuration or version mismatches.
const { initializeApp, getApps, getApp } = firebaseAppModule as any;
type FirebaseApp = any;

const firebaseConfig = {
  apiKey: "AIzaSyD4RbkdFzFIY1zbuDJF9HYbpMT2TGQJPiA",
  authDomain: "trantornovelstudio.firebaseapp.com",
  projectId: "trantornovelstudio",
  storageBucket: "trantornovelstudio.firebasestorage.app",
  messagingSenderId: "585832312756",
  appId: "1:585832312756:web:6dbbc5880943293bc54ce1",
  measurementId: "G-KRQHND2WJY"
};

let app: FirebaseApp;
let db: Firestore;

try {
  // Use modular getApps() to check if app is already initialized
  if (getApps && getApps().length > 0) {
    app = getApp();
    db = getFirestore(app);
  } else if (initializeApp) {
    app = initializeApp(firebaseConfig);
    // Use initializeFirestore to enforce settings like long polling
    db = initializeFirestore(app, { experimentalForceLongPolling: true });
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const COLLECTION_NAME = 'worlds';

// Helper to remove undefined values which Firestore doesn't accept
const cleanData = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => cleanData(item));
  } else if (data !== null && typeof data === 'object') {
    return Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = cleanData(value);
      }
      return acc;
    }, {} as any);
  }
  return data;
};

export const saveWorld = async (worldData: WorldData): Promise<string> => {
  if (!db) throw new Error("Firebase not initialized");
  
  const cleanedData = cleanData(worldData);
  
  try {
    if (cleanedData.id) {
      const worldRef = doc(db, COLLECTION_NAME, cleanedData.id);
      await updateDoc(worldRef, { ...cleanedData, lastModified: Date.now() });
      return cleanedData.id;
    } else {
      // Remove id from data payload if it exists, let Firestore generate one
      const { id, ...dataToSave } = cleanedData;
      const docRef = await addDoc(collection(db, COLLECTION_NAME), { ...dataToSave, createdAt: Date.now(), lastModified: Date.now() });
      return docRef.id;
    }
  } catch (e) {
    console.error("Error saving world:", e);
    throw e;
  }
};

export const getWorlds = async (): Promise<WorldData[]> => {
  if (!db) throw new Error("Firebase not initialized");
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("lastModified", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorldData));
  } catch (error) {
    console.error("Error fetching worlds:", error);
    throw error;
  }
};

export const getWorldById = async (id: string): Promise<WorldData | null> => {
  if (!db) throw new Error("Firebase not initialized");
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as WorldData;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching world by ID:", error);
    throw error;
  }
};

export const deleteWorld = async (id: string): Promise<void> => {
  if (!db) throw new Error("Firebase not initialized");
  try {
    console.log(`[Firebase] Deleting document with ID: ${id}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log(`[Firebase] Document ${id} deleted successfully`);
  } catch (error) {
    console.error("Error deleting world:", error);
    throw error;
  }
};
