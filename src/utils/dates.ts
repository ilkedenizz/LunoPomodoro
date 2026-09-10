export const isToday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const today = new Date();
  return isSameDay(date.getTime(), today.getTime());
};

export const isYesterday = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date.getTime(), yesterday.getTime());
};

export const isSameDay = (ts1: number, ts2: number): boolean => {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const getStartOfWeek = (d: Date = new Date()): Date => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sun, 1 is Mon
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getEndOfWeek = (d: Date = new Date()): Date => {
  const start = getStartOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDateLabel = (timestamp: number): string => {
  if (isToday(timestamp)) return 'Today';
  if (isYesterday(timestamp)) return 'Yesterday';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDuration = (totalMinutes: number): string => {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

 
