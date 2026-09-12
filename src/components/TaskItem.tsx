import React, { useState } from 'react';
import { CheckCircle2, Circle, Trash2, Edit2, Check, Target } from 'lucide-react';
import type { Task, AppTheme, AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  onToggleComplete: (id: string) => void;
  onSelectActive: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onDeleteTask: (id: string) => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  onToggleComplete,
  onSelectActive,
  onEditTask,
  onDeleteTask,
  theme = 'dark',
  language = 'en',
}) => {
  const t = getTranslations(language);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const isLight = theme === 'light';

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onEditTask(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group relative flex items-center justify-between p-3 rounded-2xl transition-all duration-200 border ${
        isActive
          ? isLight
            ? 'bg-black/10 border-black/25 ring-1 ring-black/20 shadow-md text-slate-900'
            : 'bg-white/15 border-white/40 ring-1 ring-white/30 shadow-lg text-white'
          : isLight
          ? 'bg-black/[0.03] border-black/5 hover:bg-black/[0.07] hover:border-black/15 text-slate-800'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white'
      }`}
    >
      {/* Left Area: Checkbox + Title / Edit Input */}
      <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
        {/* Toggle Complete Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          aria-label={task.completed ? (language === 'tr' ? 'Görevi tamamlanmadı olarak işaretle' : 'Mark task as incomplete') : (language === 'tr' ? 'Görevi tamamlandı olarak işaretle' : 'Mark task as completed')}
          className="shrink-0 focus:outline-none transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
          ) : (
            <Circle
              className={`w-5 h-5 ${
                isLight
                  ? 'text-slate-400 hover:text-slate-800'
                  : 'text-white/40 hover:text-white/80'
              }`}
            />
          )}
        </button>

        {/* Title or Edit Input */}
        {isEditing ? (
          <div className="flex items-center space-x-2 flex-1">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className={`w-full rounded-lg px-2 py-0.5 text-xs focus:outline-none ${
                isLight
                  ? 'bg-white text-slate-900 border border-slate-300'
                  : 'bg-white/10 text-white border border-white/30'
              }`}
            />
            <button
              onClick={handleSaveEdit}
              aria-label={t.save}
              className="p-1 text-emerald-600 hover:text-emerald-500"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            className="flex flex-col min-w-0 cursor-pointer select-none"
            title={language === 'tr' ? 'Düzenlemek için çift tıklayın' : 'Double-click to edit'}
          >
            <span
              className={`text-xs sm:text-sm font-medium transition-all line-clamp-1 ${
                task.completed
                  ? isLight
                    ? 'line-through text-slate-400'
                    : 'line-through text-white/40'
                  : isLight
                  ? 'text-slate-900'
                  : 'text-white/90'
              }`}
            >
              {task.title}
            </span>
            {task.pomodoros > 0 && (
              <span
                className={`text-[10px] font-mono ${
                  isLight ? 'text-slate-500' : 'text-white/50'
                }`}
              >
                {task.pomodoros} {language === 'tr' ? 'pomodoro' : task.pomodoros === 1 ? 'pomodoro' : 'pomodoros'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Area: Actions (Active Task Badge / Select Button, Edit, Delete) */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Set Active Task Button */}
        {!task.completed && (
          <button
            onClick={() => onSelectActive(task.id)}
            aria-label={isActive ? (language === 'tr' ? 'Aktif odaklanılan görev' : 'Active focusing task') : t.selectAsActive}
            title={isActive ? (language === 'tr' ? 'Şu An Odaklanılıyor' : 'Currently Focusing') : t.selectAsActive}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
              isActive
                ? isLight
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'bg-white text-black font-semibold shadow-glow'
                : isLight
                ? 'text-slate-400 hover:text-slate-900 hover:bg-black/5 opacity-0 group-hover:opacity-100 sm:opacity-100'
                : 'text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 sm:opacity-100'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            {isActive && <span className="text-[10px] hidden sm:inline">{language === 'tr' ? 'Odaklanılıyor' : 'Focusing'}</span>}
          </button>
        )}

        {/* Edit Button */}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            aria-label={t.edit}
            className={`p-1.5 rounded-lg opacity-75 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 transition-all ${
              isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-black/5'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={t.edit}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete Action with inline confirm */}
        {isConfirmingDelete ? (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onDeleteTask(task.id)}
              className="px-2 py-0.5 rounded bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold transition-all"
            >
              {t.delete}
            </button>
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className={`px-1.5 py-0.5 text-[10px] ${
                isLight ? 'text-slate-500 hover:text-slate-900' : 'text-white/50 hover:text-white'
              }`}
            >
              {language === 'tr' ? 'Hayır' : 'No'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            aria-label={t.delete}
            className={`p-1.5 rounded-lg opacity-75 md:opacity-0 md:group-hover:opacity-100 hover:opacity-100 transition-all ${
              isLight
                ? 'text-slate-500 hover:text-rose-600 hover:bg-black/5'
                : 'text-white/60 hover:text-red-300 hover:bg-white/10'
            }`}
            title={t.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
 
