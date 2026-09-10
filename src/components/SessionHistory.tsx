import React from 'react';
import { History, Clock, CheckCircle } from 'lucide-react';
import { formatTime, formatDuration } from '../utils/dates';
import type { GroupedSessionHistory } from '../utils/statistics';

interface SessionHistoryProps {
  groupedSessions: GroupedSessionHistory[];
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ groupedSessions }) => {
  if (groupedSessions.length === 0) return null;

  return (
    <div className="w-full p-4 sm:p-6 rounded-3xl glass-panel border border-white/10 flex flex-col space-y-4">
      {/* Title */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
        <History className="w-4 h-4 text-white/70" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Recent Sessions
        </h3>
      </div>

      {/* Grouped Days */}
      <div className="space-y-4">
        {groupedSessions.map((group) => (
          <div key={group.dateKey} className="space-y-2">
            {/* Day Header */}
            <div className="flex items-center justify-between text-xs font-medium text-white/60">
              <span className="text-white/90 font-semibold">{group.dateLabel}</span>
              <span>
                {group.pomodoros} {group.pomodoros === 1 ? 'session' : 'sessions'} •{' '}
                {formatDuration(group.totalMinutes)}
              </span>
            </div>

            {/* Day's Sessions */}
            <div className="space-y-1.5">
              {group.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center space-x-2.5">
                    <Clock className="w-3.5 h-3.5 text-white/40" />
                    <span className="font-mono text-white/60">{formatTime(session.timestamp)}</span>
                    <span className="text-white/90 font-medium truncate max-w-[200px] sm:max-w-xs">
                      {session.taskTitle || 'Focus Session'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 text-white/60 font-mono text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400/80" />
                    <span>{session.durationMinutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
 
