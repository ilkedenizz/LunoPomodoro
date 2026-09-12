import React, { useState } from 'react';
import { ListTodo, Plus } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { TaskInput } from './TaskInput';
import type { Task, AppTheme, AppLanguage } from '../types';
import { getTranslations } from '../utils/translations';

interface TaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  onAddTask: (title: string) => void;
  onToggleComplete: (id: string) => void;
  onSelectActive: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onDeleteTask: (id: string) => void;
  theme?: AppTheme;
  language?: AppLanguage;
}

export const TaskList: React.FC<TaskListProps> = React.memo(({
  tasks,
  activeTaskId,
  onAddTask,
  onToggleComplete,
  onSelectActive,
  onEditTask,
  onDeleteTask,
  theme = 'dark',
  language = 'en',
}) => {
  const t = getTranslations(language);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const isLight = theme === 'light';
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const displayedTasks =
    filter === 'pending'
      ? pendingTasks
      : filter === 'completed'
      ? completedTasks
      : tasks;

  return (
    <div
      className={`w-full p-5 rounded-3xl glass-panel transition-all duration-300 shadow-lg flex flex-col max-h-[420px] xl:max-h-[460px] ${
        isLight ? 'border-black/10 text-slate-900' : 'border-white/10 text-white'
      }`}
    >
      {/* Panel Header */}
      <div
        className={`flex items-center justify-between pb-3 border-b shrink-0 ${
          isLight ? 'border-black/10' : 'border-white/10'
        }`}
      >
        <div className="flex items-center space-x-2">
          <ListTodo className={`w-4 h-4 ${isLight ? 'text-indigo-600' : 'text-white/80'}`} />
          <h2
            className={`text-xs font-semibold tracking-wider uppercase ${
              isLight ? 'text-slate-600' : 'text-white/70'
            }`}
          >
            {t.tasks}
          </h2>
          {tasks.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                isLight ? 'bg-black/5 text-slate-600' : 'bg-white/10 text-white/70'
              }`}
            >
              {pendingTasks.length} {language === 'tr' ? 'kaldı' : 'left'}
            </span>
          )}
        </div>

        {/* Action / Add Task button */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            aria-label={t.addTask}
            className={`p-1 px-2.5 rounded-xl font-medium text-xs transition-all flex items-center space-x-1 ${
              isLight
                ? 'bg-black/5 hover:bg-black/10 text-slate-800'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addTask}</span>
          </button>
        )}
      </div>

      {/* Inline Add Task Input */}
      {isAdding && (
        <div className="py-3 shrink-0">
          <TaskInput
            onAddTask={(title) => {
              onAddTask(title);
              setIsAdding(false);
            }}
            onCancel={() => setIsAdding(false)}
            theme={theme}
            language={language}
          />
        </div>
      )}

      {/* Filter Tabs */}
      {tasks.length > 0 && (
        <div
          className={`flex items-center space-x-2 py-2 text-[11px] font-medium shrink-0 ${
            isLight ? 'text-slate-500' : 'text-white/60'
          }`}
        >
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === 'all'
                ? isLight
                  ? 'bg-black/10 text-slate-900 font-semibold'
                  : 'bg-white/20 text-white font-semibold'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-white'
            }`}
          >
            {language === 'tr' ? `Tümü (${tasks.length})` : `All (${tasks.length})`}
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === 'pending'
                ? isLight
                  ? 'bg-black/10 text-slate-900 font-semibold'
                  : 'bg-white/20 text-white font-semibold'
                : isLight
                ? 'hover:text-slate-900'
                : 'hover:text-white'
            }`}
          >
            {language === 'tr' ? `Aktif (${pendingTasks.length})` : `Active (${pendingTasks.length})`}
          </button>
          {completedTasks.length > 0 && (
            <button
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === 'completed'
                  ? isLight
                    ? 'bg-black/10 text-slate-900 font-semibold'
                    : 'bg-white/20 text-white font-semibold'
                  : isLight
                  ? 'hover:text-slate-900'
                  : 'hover:text-white'
              }`}
            >
              {language === 'tr' ? `Tamamlanan (${completedTasks.length})` : `Done (${completedTasks.length})`}
            </button>
          )}
        </div>
      )}

      {/* Tasks List Content */}
      <div className="space-y-2 py-2 overflow-y-auto pr-1 flex-1">
        {displayedTasks.length === 0 ? (
          <div
            className={`py-8 text-center flex flex-col items-center justify-center ${
              isLight ? 'text-slate-400' : 'text-white/40'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${
              isLight ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/30 border border-white/10'
            }`}>
              <ListTodo className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-xs max-w-[220px] leading-relaxed mb-3">
              {tasks.length === 0
                ? (language === 'tr' ? 'Henüz görev eklenmedi. Odaklanmak istediğiniz görevi ekleyin.' : 'No tasks added yet. Add a task to start focusing.')
                : (language === 'tr' ? 'Bu görünümde görev bulunmuyor.' : 'No tasks in this view.')}
            </p>
            {tasks.length === 0 && !isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  isLight
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addTask}</span>
              </button>
            )}
          </div>
        ) : (
          displayedTasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              isActive={t.id === activeTaskId}
              onToggleComplete={onToggleComplete}
              onSelectActive={onSelectActive}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              theme={theme}
              language={language}
            />
          ))
        )}
      </div>
    </div>
  );
});

TaskList.displayName = 'TaskList';

