import React from "react";

export default function RouteLoader() {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[50vh] text-slate-400">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-bold animate-pulse text-slate-500">Loading page content...</p>
    </div>
  );
}
