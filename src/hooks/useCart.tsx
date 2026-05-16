import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface CartItem {
  id: string;
  title: string;
  price: number;
  category: string;
  icon?: string;
  imageUrl?: string;
  variant?: any;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  total: number;
  selectedVehicle: any;
  setSelectedVehicle: (vehicle: any) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('carmechs_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedVehicle, setSelectedVehicle] = useState<any>(() => {
    const saved = localStorage.getItem('carmechs_vehicle');
    return saved ? JSON.parse(saved) : { make: "", model: "", fuel: "", year: "", plate: "" };
  });

  useEffect(() => {
    localStorage.setItem('carmechs_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('carmechs_vehicle', JSON.stringify(selectedVehicle));
  }, [selectedVehicle]);

  const addToCart = (item: CartItem) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        toast.info("Intelligence Unit: Service already in operation manifest.");
        return prev;
      }
      toast.success(`${item.title} added to service queue.`);
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast.warning("Service purged from manifest.");
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, total, selectedVehicle, setSelectedVehicle }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
