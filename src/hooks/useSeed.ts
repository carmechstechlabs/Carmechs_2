import { useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const MYFNG_SERVICES = [
  {
    title: "Basic Periodic Service",
    description: "Ideal for cars driven less than 5000km/year. Includes basic engine health check and oil top-up.",
    price: 1999,
    category: "Periodic",
    isActive: true,
    icon: "Wrench",
    imageUrl: "https://picsum.photos/seed/periodic/800/600",
    features: ["Engine Oil Top-up", "Oil Filter Cleaning", "Coolant Top-up", "Wiper Fluid Replacement", "50 Points Inspection"]
  },
  {
    title: "Standard Periodic Service",
    description: "Our most popular service for everyday city driving. Recommended every 10,000 km.",
    price: 3499,
    category: "Periodic",
    isActive: true,
    icon: "Settings",
    imageUrl: "https://picsum.photos/seed/standard/800/600",
    features: ["Full Engine Oil Change", "Oil Filter Replacement", "Air Filter Cleaning", "Brake Pad Cleaning", "Battery Health Check"]
  },
  {
    title: "Deep Engine Cleaning",
    description: "Revitalize your engine's performance by removing carbon deposits and sludge.",
    price: 2499,
    category: "Engine",
    isActive: true,
    icon: "Activity",
    imageUrl: "https://picsum.photos/seed/engine/800/600",
    features: ["Engine Flushing", "Carbon Cleaning", "Throttle Body Cleaning", "Injector Cleaning", "Fuel Additive Treatment"]
  },
  {
    title: "Advanced AC Service",
    description: "Ensure ice-cold air even in peak summer. Includes full gas recharging and leak tests.",
    price: 1899,
    category: "AC",
    isActive: true,
    icon: "Droplets",
    imageUrl: "https://picsum.photos/seed/ac/800/600",
    features: ["AC Gas Charging", "Condenser Cleaning", "Cooling Coil Cleaning", "Cabin Filter Replacement", "Leakage Testing"]
  },
  {
    title: "Brake Overhaul",
    description: "Maximum safety with factory-grade brake components and precision resurfacing.",
    price: 1599,
    category: "Brake",
    isActive: true,
    icon: "Disc",
    imageUrl: "https://picsum.photos/seed/brakes/800/600",
    features: ["Brake Pad Replacement", "Disc Resurfacing", "Brake Fluid Top-up", "Caliper Greasing", "Handbrake Adjustment"]
  },
  {
    title: "Clutch Repair & Service",
    description: "Smooth gear shifts and improved fuel efficiency with our clutch specialist service.",
    price: 4999,
    category: "Clutch",
    isActive: true,
    icon: "Zap",
    imageUrl: "https://picsum.photos/seed/clutch/800/600",
    features: ["Clutch Plate Replacement", "Pressure Plate Alignment", "Release Bearing Replacement", "Flywheel Resurfacing", "Clutch Cable Adjustment"]
  },
  {
    title: "Wheel Care Package",
    description: "Improve tyre life and vehicle stability with computerized alignment and balancing.",
    price: 999,
    category: "Tyre",
    isActive: true,
    icon: "Gauge",
    imageUrl: "https://picsum.photos/seed/tyre/800/600",
    features: ["Computerized Wheel Alignment", "Wheel Balancing", "Automatic Tyre Rotation", "Nitrogen Filling", "Tyre Health Report"]
  },
  {
    title: "Luxury Interior Detailing",
    description: "Restore that showroom feel with deep steam cleaning and premium upholstery polish.",
    price: 2999,
    category: "Detailing",
    isActive: true,
    icon: "Shield",
    imageUrl: "https://picsum.photos/seed/detailing/800/600",
    features: ["Full Interior Steam Cleaning", "Upholstery Shampoo", "Leather Conditioning", "Roof & Carpet Cleaning", "Anti-Bacterial Treatment"]
  },
  {
    title: "Full Body Ceramic Coating",
    description: "9H Hardness ceramic shield for ultimate paint protection and hydrophobic mirror finish.",
    price: 12999,
    category: "Detailing",
    isActive: true,
    icon: "Shield",
    imageUrl: "https://picsum.photos/seed/ceramic/800/600",
    features: ["Minor Scratch Removal", "Paint Correction", "3 Layer Ceramic Coating", "5 Year Warranty", "Hydrophobic Coating"]
  }
];

export function useSeed() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      // Only seed if logged in as the specific admin to avoid permission errors
      if (user && user.email === "carmechstechlabs@gmail.com") {
        const seed = async () => {
          try {
            const servicesRef = collection(db, "services");
            const snapshot = await getDocs(servicesRef);
            
            if (snapshot.empty) {
              console.log("Seeding MyFNG services as admin...");
              for (const service of MYFNG_SERVICES) {
                await addDoc(servicesRef, service);
              }
              console.log("Seeding complete.");
            }
          } catch (err) {
            console.error("Seeding error:", err);
          }
        };
        seed();
      }
    });
    
    return unsub;
  }, []);
}
