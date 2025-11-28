// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import "firebase/storage";

// Initialize Firebase only if it is not already initialized

    const firebaseConfig = {
        apiKey: "AIzaSyASz-PkzBPPEzU6YS7JA79JbfISKqCAuFM",
        authDomain: "vtu-gpt-5a7d5.firebaseapp.com",
        projectId: "vtu-gpt-5a7d5",
        storageBucket: "vtu-gpt-5a7d5.firebasestorage.app",
        messagingSenderId: "956203126772",
        appId: "1:956203126772:web:5935117d328eaacbf873a1",
        measurementId: "G-HFGE0Y38PE"
      };

  // Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize auth and export it
const auth = getAuth(app);

export { auth };  // Ensure auth is exported correctly
