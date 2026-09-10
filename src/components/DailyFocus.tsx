import React, { useState } from 'react';
import { Target, CheckCircle2, Edit2, Check } from 'lucide-react';
import type { DailyGoal, AppTheme } from '../types';

interface DailyFocusProps {
  todayPomodoros: number;
  todayMinutes: number;
  dailyGoal: DailyGoal;
  onUpdateGoal: (newGoal: DailyGoal) => void;
  theme?: AppTheme;
}

export const DailyFocus: React.FC<DailyFocusProps> = ({
  todayPomodoros,
  todayMinutes,
  dailyGoal,
  onUpdateGoal,
  theme = 'dark',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTargetPomodoros, setTempTargetPomodoros] = useState(dailyGoal.targetPomodoros);

  const isLight = theme === 'light';

  const progressPercent = Math.min(
    100,
    Math.round((todayPomodoros / Math.max(1, dailyGoal.targetPomodoros)) * 100)
  );

  const isGoalReached = todayPomodoros >= dailyGoal.targetPomodoros;

  const handleSaveGoal = () => {
    const updatedPomodoros = Math.max(1, Math.min(24, tempTargetPomodoros));
    onUpdateGoal({
      targetPomodoros: updatedPomodoros,
      targetMinutes: updatedPomodoros * 25, // default 25m per session
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`w-full p-5 rounded-3xl glass-panel transition-all duration-300 shadow-lg ${
        isLight ? 'border-black/10 text-slate-900' : 'border-white/10 text-white'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Target className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-white/80'}`} />
          <span
            className={`text-xs font-semibold tracking-wider uppercase ${
              isLight ? 'text-slate-600' : 'text-white/70'
            }`}
          >
            Today's Focus
          </span>
        </div>

        {/* Goal Edit Button */}
        {!isEditing ? (
          <button
            onClick={() => {
              setTempTargetPomodoros(dailyGoal.targetPomodoros);
              setIsEditing(true);
            }}
            className={`p-1 rounded-lg transition-all text-xs flex items-center gap-1 ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="Edit Daily Goal"
            aria-label="Edit daily goal"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSaveGoal}
            className={`p-1 px-2 rounded-lg font-medium transition-all text-xs flex items-center gap-1 ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white/20 hover:bg-white/30 text-white'
            }`}
            title="Save Daily Goal"
            aria-label="Save daily goal"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save</span>
          </button>
        )}
      </div>

      {/* Editing View vs Normal View */}
      {isEditing ? (
        <div className="py-2 flex items-center justify-between text-xs">
          <span className={isLight ? 'text-slate-700' : 'text-white/70'}>
            Target Pomodoros:
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTempTargetPomodoros((prev) => Math.max(1, prev - 1))}
              className={`w-6 h-6 rounded font-bold flex items-center justify-center ${
                isLight ? 'bg-black/10 hover:bg-black/20 text-slate-900' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              -
            </button>
            <span className="font-timer text-sm font-bold w-6 text-center">
              {tempTargetPomodoros}
            </span>
            <button
              onClick={() => setTempTargetPomodoros((prev) => Math.min(24, prev + 1))}
              className={`w-6 h-6 rounded font-bold flex items-center justify-center ${
                isLight ? 'bg-black/10 hover:bg-black/20 text-slate-900' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Numbers Summary */}
          <div className="flex items-baseline justify-between mb-2">
            <div className="flex items-baseline space-x-1.5">
              <span className="font-timer text-xl font-bold">
                {todayPomodoros}
              </span>
              <span className={`text-xs ${isLight ? 'text-slate-400' : 'text-white/50'}`}>/</span>
              <span className={`font-timer text-sm ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                {dailyGoal.targetPomodoros} sessions
              </span>
            </div>

            <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
              <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {todayMinutes} min
              </span>
              <span className={isLight ? 'text-slate-400' : 'text-white/40'}> focused</span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div
            className={`relative w-full h-2.5 rounded-full overflow-hidden mb-1 ${
              isLight ? 'bg-black/10' : 'bg-white/10'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isGoalReached
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow'
                  : isLight
                  ? 'bg-indigo-600'
                  : 'bg-white/80'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Bottom State */}
          <div className="flex items-center justify-between text-[11px]">
            <span
              className={`font-mono ${
                isLight ? 'text-slate-500' : 'text-white/50'
              }`}
            >
              Progress {progressPercent}%
            </span>
            {isGoalReached && (
              <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-300 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>Daily goal complete</span>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};
 
