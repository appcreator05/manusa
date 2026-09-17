import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Official Firebase Project Config provided by the user
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCyDd6rCV7WaQe8sMF0Xmob3dpm6z6wEEQ",
  authDomain: "myapps-4a8eb.firebaseapp.com",
  databaseURL: "https://myapps-4a8eb-default-rtdb.firebaseio.com",
  projectId: "myapps-4a8eb",
  storageBucket: "myapps-4a8eb.appspot.com",
  messagingSenderId: "342267842050",
  appId: "1:342267842050:web:ed2b51fb9d0a9f7894611b"
};

// Singleton initialization for Firebase
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebaseDb = getDatabase(firebaseApp);
