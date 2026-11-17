import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// OLYMPUS Firebase project configuration.
// Firebase web config is public; protect data with Firebase Security Rules.
const config = {
  apiKey: "AIzaSyAI7Fj5a1fATW2HdUpVxcMgYSlmWHl6y3M",
  authDomain: "olympus-4444e.firebaseapp.com",
  projectId: "olympus-4444e",
  storageBucket: "olympus-4444e.firebasestorage.app",
  messagingSenderId: "632397919667",
  appId: "1:632397919667:web:2e248402fb2295bd4987c6",
  measurementId: "G-EM2T2FWJYG"
};

export const firebaseConfigured = true;
export const firebaseApp = initializeApp(config);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
