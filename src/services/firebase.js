// 1. Install Firebase: npm install firebase
// 2. Go to https://console.firebase.google.com/
// 3. Create a project > Add Web App > Copy config object
// 4. Paste config below

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    // apiKey: "...",
    // authDomain: "...",
    // projectId: "...",
    // storageBucket: "...",
    // messagingSenderId: "...",
    // appId: "..."
};

// Initialize Firebase (only if config is present)
const app = firebaseConfig.projectId ? initializeApp(firebaseConfig) : null;

export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const auth = app ? getAuth(app) : null;
