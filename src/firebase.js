import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBK1MKtPW8_Dnx4UaPaw0RYwhL4IMDkSac",
  authDomain: "gym-storage-3ac7a.firebaseapp.com",
  projectId: "gym-storage-3ac7a",
  storageBucket: "gym-storage-3ac7a.firebasestorage.app",
  messagingSenderId: "961012741152",
  appId: "1:961012741152:web:1cabe85af60d40375d3845",
  measurementId: "G-FTFHGPMKNY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };