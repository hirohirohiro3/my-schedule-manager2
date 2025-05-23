// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics"; // Google Analytics を使用する場合はコメントを外す

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBLpA4IiX7KYMlzuZgJknPixtFTOzWqM6w", // あなたのAPIキー
  authDomain: "my-schedule-app-firebase.firebaseapp.com", // あなたのAuthドメイン
  projectId: "my-schedule-app-firebase", // あなたのプロジェクトID
  storageBucket: "my-schedule-app-firebase.firebasestorage.app", // あなたのStorageバケット
  messagingSenderId: "670141290078", // あなたのSender ID
  appId: "1:670141290078:web:3ba2c0ab3d6a57c96a86cf", // あなたのApp ID
  measurementId: "G-CXNVWRTYW2" // Google Analytics を使用する場合
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
// const analytics = getAnalytics(app); // Google Analytics を使用する場合はコメントを外す
