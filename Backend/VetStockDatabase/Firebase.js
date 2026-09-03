// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBo2tJYCNrHJPHomUIDBKkcL45iI8hogko",
    authDomain: "vetstockdatabase.firebaseapp.com",
    projectId: "vetstockdatabase",
    storageBucket: "vetstockdatabase.firebasestorage.app",
    messagingSenderId: "400977876513",
    appId: "1:400977876513:web:3e85258fc84f0edc117560",
    measurementId: "G-8FMTG3QS3G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export Firestore
export { db };