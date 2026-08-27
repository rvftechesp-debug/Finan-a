'use client';
import { useTrackAccess } from '@/app/hooks/useTrackAccess';

export default function Tracker() {
  useTrackAccess();
  return null;
}
