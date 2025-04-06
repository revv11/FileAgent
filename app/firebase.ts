import { getApp,getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";



const firebaseConfig = {
    apiKey: "AIzaSyALvoqkh_Te1P2tyr0ps3fbLhmy4ucVNPE",
    authDomain: "aiagent-cf5ab.firebaseapp.com",
    projectId: "aiagent-cf5ab",
    storageBucket: "aiagent-cf5ab.firebasestorage.app",
    messagingSenderId: "883461244056",
    appId: "1:883461244056:web:4bde653bcf437164233ced"
  };


const app = getApps().length === 0 ? initializeApp(firebaseConfig): getApp();


const db = getFirestore(app)



export { db } 