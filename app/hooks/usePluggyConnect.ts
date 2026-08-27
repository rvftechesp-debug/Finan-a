"use client";
import { useState, useCallback } from "react";

export function usePluggyConnect(onSuccess: (itemId: string) => void) {
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const connect = useCallback(async () => {
    const res = await fetch("/api/pluggy/connect-token", { method: "POST" });
    const { accessToken } = await res.json();
    setToken(accessToken);
    setOpen(true);
  }, []);

  const handleSuccess = useCallback(
    (data: { item: { id: string } }) => {
      onSuccess(data.item.id);
      setOpen(false);
    },
    [onSuccess]
  );

  return { token, open, connect, setOpen, handleSuccess };
}
