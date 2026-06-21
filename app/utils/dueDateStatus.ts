export type DueDateStatus = 'overdue' | 'due-today' | 'upcoming' | 'ok' | null;

export function getDueDateStatus(
  dueDate: string | null | undefined,
  paid: boolean
): DueDateStatus {
  if (paid || !dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due-today';
  if (diffDays <= 3) return 'upcoming';
  return 'ok';
}

export function getDueDateLabel(status: DueDateStatus, dueDate: string): string {
  const formatted = new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR');
  switch (status) {
    case 'overdue':   return `⚠️ Vencida em ${formatted}`;
    case 'due-today': return `🔴 Vence hoje!`;
    case 'upcoming':  return `🟡 Vence em ${formatted}`;
    default:          return `📅 ${formatted}`;
  }
}
