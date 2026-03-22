import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCTUp_5yMhoIp2UINVkQ0vpnd4ruT5cE8M",
  authDomain: "ride-app-dd741.firebaseapp.com",
  projectId: "ride-app-dd741",
  storageBucket: "ride-app-dd741.firebasestorage.app",
  messagingSenderId: "687926260250",
  appId: "1:687926260250:web:d5a5c90b35a7e70ae017a3",
  measurementId: "G-FFJ93JGYHP",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);