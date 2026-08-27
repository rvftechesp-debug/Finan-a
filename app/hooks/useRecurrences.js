// hooks/useRecurrences.js
import { useState, useEffect, useCallback } from 'react';
import * as api from '@/services/recurrences';

export function useRecurrences() {
  const [recurrences, setRecurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setRecurrences(await api.getRecurrences());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (payload) => {
    const item = await api.createRecurrence(payload);
    setRecurrences((prev) => [...prev, item]);
    return item;
  };

  const update = async (id, payload) => {
    const item = await api.updateRecurrence(id, payload);
    setRecurrences((prev) => prev.map((r) => (r.id === id ? item : r)));
    return item;
  };

  const remove = async (id) => {
    await api.deactivateRecurrence(id);
    setRecurrences((prev) => prev.filter((r) => r.id !== id));
  };

  return { recurrences, loading, error, reload: load, create, update, remove };
}
