"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./components/Scene"), { ssr: false });

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg bg-grid">
      <div className="absolute inset-0">
        <Scene />
      </div>
    </div>
  );
}
