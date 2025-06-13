
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCkP9-Ohr5z00eQgp2pvGxBTbQBsIkhsU0",
  authDomain: "myfundi-10db8.firebaseapp.com",
  databaseURL: "https://myfundi-10db8-default-rtdb.firebaseio.com",
  projectId: "myfundi-10db8",
  storageBucket: "myfundi-10db8.appspot.com", // Corrected common typo: .appspot.com instead of .firebasestorage.app
  messagingSenderId: "551622252504",
  appId: "1:551622252504:web:4102231a2b0717a20644ad",
  measurementId: "G-YE3GLJ6K3X"
};


// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const clientDb: Firestore = getFirestore(app); // Renamed db to clientDb
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);

let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}


export { app, clientDb, auth, storage, analytics }; // Export clientDb
