import React from "react";
import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-800", className)}
      {...props}
    />
  );
}

export function ServiceCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 space-y-6 animate-pulse">
          <div className="flex justify-between">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
            <div className="w-20 h-6 bg-slate-50 rounded-full" />
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-slate-100 rounded-lg w-3/4" />
            <div className="h-4 bg-slate-50 rounded-lg w-1/2" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-slate-50 rounded-lg w-full" />
            <div className="h-3 bg-slate-50 rounded-lg w-5/6" />
          </div>
          <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
            <div className="w-24 h-8 bg-slate-100 rounded-lg" />
            <div className="w-12 h-12 bg-slate-50 rounded-2xl" />
          </div>
        </div>
      ))}
    </>
  );
}

export function BookingFormSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="h-24 bg-slate-100 rounded-3xl" />
        <div className="h-24 bg-slate-100 rounded-3xl" />
      </div>
      <div className="h-40 bg-slate-100 rounded-[2.5rem]" />
      <div className="h-16 bg-primary/20 rounded-2xl w-full" />
    </div>
  );
}
