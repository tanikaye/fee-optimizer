// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Import Firestore
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvVulhrZm67Nq9pRwAMiPT12kVrJNyXlY",
  authDomain: "fee-optimizer-notifications.firebaseapp.com",
  projectId: "fee-optimizer-notifications",
  storageBucket: "fee-optimizer-notifications.firebasestorage.app",
  messagingSenderId: "1065382557790",
  appId: "1:1065382557790:web:1f5e166922dde7d3691ccf",
  measurementId: "G-HFP8H173VM",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and export it
export const db = getFirestore(app);

// Initialize Analytics
const analytics = getAnalytics(app);
