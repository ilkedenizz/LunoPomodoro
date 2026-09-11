import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { AppTheme, AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

interface TaskInputProps {
  onAddTask: (title: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const TaskInput: React.FC<TaskInputProps> = ({
  onAddTask,
  onCancel,
  autoFocus = true,
  theme = 'dark',
  language = 'en',
}) => {
  const t = getTranslations(language);
  const [title, setTitle] = useState('');
  const isLight = theme === 'light';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setTitle('');
      if (onCancel) onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div
        className={`flex items-center space-x-2 p-2 px-3 rounded-xl backdrop-blur-md focus-within:ring-2 transition-all ${
          isLight
            ? 'bg-black/5 border border-black/15 focus-within:ring-slate-400'
            : 'bg-white/10 border border-white/20 focus-within:ring-white/40'
        }`}
      >
        <Plus className={`w-4 h-4 shrink-0 ${isLight ? 'text-slate-400' : 'text-white/50'}`} />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.addTaskPlaceholder}
          autoFocus={autoFocus}
          className={`w-full bg-transparent text-sm focus:outline-none ${
            isLight
              ? 'text-slate-900 placeholder-slate-400'
              : 'text-white placeholder-white/40'
          }`}
          aria-label={t.addTaskPlaceholder}
        />
        {title.length > 0 && (
          <button
            type="submit"
            aria-label={t.addTask}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all shrink-0 ${
              isLight
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {language === 'tr' ? 'Ekle' : 'Add'}
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label={t.cancel}
            className={`p-1 rounded-lg transition-all shrink-0 ${
              isLight
                ? 'text-slate-400 hover:text-slate-900 hover:bg-black/5'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
};

 
