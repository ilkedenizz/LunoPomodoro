export type TimerColorId =
  | 'default'
  | 'white'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink';

export interface TimerColorDef {
  id: TimerColorId;
  name: string;
  nameTr: string;
  swatchHex: string;
  darkHex: string;
  lightHex: string;
  darkStroke: string;
  lightStroke: string;
  darkGlow: string;
  lightGlow: string;
  activeCycleHex: string;
}

export const TIMER_COLORS: TimerColorDef[] = [
  {
    id: 'default',
    name: 'Default / Accent',
    nameTr: 'Varsayilan',
    swatchHex: '#6366f1',
    darkHex: '#ffffff',
    lightHex: '#0f172a',
    darkStroke: '#ffffff',
    lightStroke: '#4f46e5',
    darkGlow: 'rgba(255, 255, 255, 0.1)',
    lightGlow: 'rgba(79, 70, 229, 0.14)',
    activeCycleHex: '#6366f1',
  },
  {
    id: 'white',
    name: 'White / Neutral',
    nameTr: 'Beyaz',
    swatchHex: '#e2e8f0',
    darkHex: '#ffffff',
    lightHex: '#1e293b',
    darkStroke: '#ffffff',
    lightStroke: '#334155',
    darkGlow: 'rgba(255, 255, 255, 0.12)',
    lightGlow: 'rgba(51, 65, 85, 0.1)',
    activeCycleHex: '#ffffff',
  },
  {
    id: 'red',
    name: 'Red / Coral',
    nameTr: 'Kirmizi',
    swatchHex: '#f43f5e',
    darkHex: '#fb7185',
    lightHex: '#e11d48',
    darkStroke: '#f43f5e',
    lightStroke: '#e11d48',
    darkGlow: 'rgba(244, 63, 94, 0.18)',
    lightGlow: 'rgba(225, 29, 72, 0.15)',
    activeCycleHex: '#f43f5e',
  },
  {
    id: 'orange',
    name: 'Orange / Amber',
    nameTr: 'Turuncu',
    swatchHex: '#f97316',
    darkHex: '#fb923c',
    lightHex: '#ea580c',
    darkStroke: '#f97316',
    lightStroke: '#ea580c',
    darkGlow: 'rgba(249, 115, 22, 0.18)',
    lightGlow: 'rgba(234, 88, 12, 0.15)',
    activeCycleHex: '#f97316',
  },
  {
    id: 'yellow',
    name: 'Yellow / Gold',
    nameTr: 'Sari',
    swatchHex: '#eab308',
    darkHex: '#fde047',
    lightHex: '#ca8a04',
    darkStroke: '#eab308',
    lightStroke: '#ca8a04',
    darkGlow: 'rgba(234, 179, 8, 0.18)',
    lightGlow: 'rgba(202, 138, 4, 0.15)',
    activeCycleHex: '#eab308',
  },
  {
    id: 'green',
    name: 'Green / Emerald',
    nameTr: 'Yesil',
    swatchHex: '#10b981',
    darkHex: '#34d399',
    lightHex: '#059669',
    darkStroke: '#10b981',
    lightStroke: '#059669',
    darkGlow: 'rgba(16, 185, 129, 0.18)',
    lightGlow: 'rgba(5, 150, 105, 0.15)',
    activeCycleHex: '#10b981',
  },
  {
    id: 'blue',
    name: 'Blue / Sky',
    nameTr: 'Mavi',
    swatchHex: '#0ea5e9',
    darkHex: '#38bdf8',
    lightHex: '#0284c7',
    darkStroke: '#0ea5e9',
    lightStroke: '#0284c7',
    darkGlow: 'rgba(14, 165, 233, 0.18)',
    lightGlow: 'rgba(2, 132, 199, 0.15)',
    activeCycleHex: '#0ea5e9',
  },
  {
    id: 'purple',
    name: 'Purple / Violet',
    nameTr: 'Mor',
    swatchHex: '#a855f7',
    darkHex: '#c084fc',
    lightHex: '#7c3aed',
    darkStroke: '#a855f7',
    lightStroke: '#7c3aed',
    darkGlow: 'rgba(168, 85, 247, 0.18)',
    lightGlow: 'rgba(124, 58, 237, 0.15)',
    activeCycleHex: '#a855f7',
  },
  {
    id: 'pink',
    name: 'Pink / Rose',
    nameTr: 'Pembe',
    swatchHex: '#ec4899',
    darkHex: '#f472b6',
    lightHex: '#db2777',
    darkStroke: '#ec4899',
    lightStroke: '#db2777',
    darkGlow: 'rgba(236, 72, 153, 0.18)',
    lightGlow: 'rgba(219, 39, 119, 0.15)',
    activeCycleHex: '#ec4899',
  },
];

export const getTimerColor = (id?: TimerColorId): TimerColorDef => {
  return TIMER_COLORS.find((c) => c.id === id) || TIMER_COLORS[0];
};
