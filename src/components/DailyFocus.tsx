import React, { useState } from 'react';
import { Target, CheckCircle2, Edit2, Check } from 'lucide-react';
import type { DailyGoal } from '../types';

interface DailyFocusProps {
  todayPomodoros: number;
  todayMinutes: number;
  dailyGoal: DailyGoal;
  onUpdateGoal: (newGoal: DailyGoal) => void;
}

export const DailyFocus: React.FC<DailyFocusProps> = ({
  todayPomodoros,
  todayMinutes,
  dailyGoal,
  onUpdateGoal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTargetPomodoros, setTempTargetPomodoros] = useState(dailyGoal.targetPomodoros);

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
    <div className="w-full p-4 rounded-2xl glass-panel text-white transition-all duration-300 border border-white/10">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4 text-white/80" />
          <span className="text-xs font-semibold tracking-wider uppercase text-white/70">
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
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all text-xs flex items-center gap-1"
            title="Edit Daily Goal"
            aria-label="Edit daily goal"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={handleSaveGoal}
            className="p-1 px-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-medium transition-all text-xs flex items-center gap-1"
            title="Save Daily Goal"
            aria-label="Save daily goal"
          >
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            <span>Save</span>
          </button>
        )}
      </div>

      {/* Editing View vs Normal View */}
      {isEditing ? (
        <div className="py-2 flex items-center justify-between text-xs">
          <span className="text-white/70">Target Pomodoros:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTempTargetPomodoros((prev) => Math.max(1, prev - 1))}
              className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 font-bold flex items-center justify-center text-white"
            >
              -
            </button>
            <span className="font-timer text-sm font-bold text-white w-6 text-center">
              {tempTargetPomodoros}
            </span>
            <button
              onClick={() => setTempTargetPomodoros((prev) => Math.min(24, prev + 1))}
              className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 font-bold flex items-center justify-center text-white"
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
              <span className="font-timer text-xl font-bold text-white">
                {todayPomodoros}
              </span>
              <span className="text-xs text-white/50">/</span>
              <span className="font-timer text-sm text-white/70">
                {dailyGoal.targetPomodoros} sessions
              </span>
            </div>

            <div className="text-xs text-white/70">
              <span className="font-semibold text-white">{todayMinutes} min</span>
              <span className="text-white/40"> focused</span>
            </div>
          </div>

          {/* Progress Bar Container */}
          <div className="relative w-full h-2.5 rounded-full bg-white/10 overflow-hidden mb-1">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isGoalReached
                  ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-glow'
                  : 'bg-white/80'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Bottom State */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/50 font-mono">
              Progress {progressPercent}%
            </span>
            {isGoalReached && (
              <span className="flex items-center space-x-1 text-emerald-300 font-medium">
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
 
