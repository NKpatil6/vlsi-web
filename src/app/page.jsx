"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    window.location.href = "/dashboard";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
