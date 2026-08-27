"use client";
import { PluggyConnect } from "react-pluggy-connect";
import { usePluggyConnect } from "@/app/hooks/usePluggyConnect";

export function ConnectBankButton() {
  const { token, open, connect, setOpen, handleSuccess } = usePluggyConnect(
    async (itemId) => {
      await fetch("/api/pluggy/items", {
        method: "POST",
        body: JSON.stringify({ itemId }),
      });
    }
  );

  return (
    <>
      <button onClick={connect}>Conectar banco</button>

      {open && token && (
        <PluggyConnect
          connectToken={token}
          onSuccess={handleSuccess}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
