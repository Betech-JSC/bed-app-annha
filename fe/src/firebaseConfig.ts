// src/firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// ⚙️ Cấu hình Firebase — bạn lấy phần này trong Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBBA8T1_bj42GoylRQd2ai9kiGm5yVXCGc",
    authDomain: "skysend-ae264.firebaseapp.com",
    databaseURL: "https://skysend-ae264-default-rtdb.firebaseio.com",
    projectId: "skysend-ae264",
    storageBucket: "skysend-ae264.firebasestorage.app",
    messagingSenderId: "556285265499",
    appId: "1:556285265499:web:b1605be4363cd6c4ffe17e",
    measurementId: "G-JLH65F71P7"
};

// 🚀 Khởi tạo Firebase App (chỉ 1 lần duy nhất)
const app = initializeApp(firebaseConfig);

// 🔐 Firebase Auth
const auth = getAuth(app);

// 💾 Firebase Realtime Database
const database = getDatabase(app);

// 🗂️ Firebase Storage
const storage = getStorage(app);

export { app, auth, database, storage };
