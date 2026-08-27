"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const FinancasApp = dynamic(() => import("@/app/FinancasApp"), {
  ssr: false,
  loading: () => <div>Carregando...</div>,
});

export default function Home() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <FinancasApp />
    </Suspense>
  );
}
