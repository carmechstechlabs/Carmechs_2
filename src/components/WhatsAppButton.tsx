import React from "react";
import { MessageCircle } from "lucide-react";
import { useConfig } from "../hooks/useConfig";

export default function WhatsAppButton() {
  const { config } = useConfig();
  
  if (config.whatsappEnabled === false) return null;

  const whatsappUrl = `https://wa.me/91${config.whatsappNumber || config.supportPhone || '9831231431'}?text=Hi! I want to know more about your car services.`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-10 right-10 z-[100] bg-white text-primary p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group flex items-center gap-2 border-4 border-primary"
    >
      <div className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black uppercase tracking-widest text-[10px] whitespace-nowrap px-0 group-hover:px-4 text-primary">
        Chat with us
      </div>
      <MessageCircle size={28} className="fill-primary/20" />
    </a>
  );
}
