
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function addService() {
  const service = {
    title: "Pre-Purchase Inspection",
    description: "A comprehensive bumper-to-bumper inspection designed to give you peace of mind before buying a used vehicle. Our expert mechanics perform a rigorous assessment of the mechanical, electrical, and structural integrity of the car.",
    price: 2499,
    category: "Shield",
    icon: "ShieldCheck",
    isActive: true,
    features: [
      "Comprehensive Vehicle History Check",
      "Engine Health Diagnosis",
      "Electrical System Scan",
      "Bodywork & Paint Inspection",
      "Road Test Evaluation"
    ],
    excerpt: "Expert evaluation before you buy.",
    variants: []
  };

  try {
    // Check if it already exists
    const q = query(collection(db, "services"), where("title", "==", service.title));
    const snap = await getDocs(q);
    if (snap.empty) {
      const docRef = await addDoc(collection(db, "services"), service);
      console.log("Service added with ID: ", docRef.id);
    } else {
      console.log("Service already exists.");
    }
  } catch (e) {
    console.error("Error adding service: ", e);
  }
}

addService();
