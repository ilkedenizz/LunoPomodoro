import React, { useState } from 'react';
import { ListTodo, Plus, CheckCircle2 } from 'lucide-react';
import { TaskItem } from './TaskItem';
import { TaskInput } from './TaskInput';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  onAddTask: (title: string) => void;
  onToggleComplete: (id: string) => void;
  onSelectActive: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeTaskId,
  onAddTask,
  onToggleComplete,
  onSelectActive,
  onEditTask,
  onDeleteTask,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const displayedTasks =
    filter === 'pending'
      ? pendingTasks
      : filter === 'completed'
      ? completedTasks
      : tasks;

  return (
    <div className="w-full p-4 rounded-3xl glass-panel text-white transition-all duration-300 border border-white/10 flex flex-col max-h-[500px]">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
        <div className="flex items-center space-x-2">
          <ListTodo className="w-4 h-4 text-white/80" />
          <h2 className="text-xs font-semibold tracking-wider uppercase text-white/70">
            Focus Tasks
          </h2>
          {tasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/70 font-mono">
              {pendingTasks.length} left
            </span>
          )}
        </div>

        {/* Action / Add Task button */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            aria-label="Add a task"
            className="p-1 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-all flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
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
          />
        </div>
      )}

      {/* Filter Tabs */}
      {tasks.length > 0 && (
        <div className="flex items-center space-x-2 py-2 text-[11px] font-medium text-white/60 shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === 'all' ? 'bg-white/20 text-white font-semibold' : 'hover:text-white'
            }`}
          >
            All ({tasks.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filter === 'pending' ? 'bg-white/20 text-white font-semibold' : 'hover:text-white'
            }`}
          >
            Active ({pendingTasks.length})
          </button>
          {completedTasks.length > 0 && (
            <button
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filter === 'completed' ? 'bg-white/20 text-white font-semibold' : 'hover:text-white'
              }`}
            >
              Done ({completedTasks.length})
            </button>
          )}
        </div>
      )}

      {/* Tasks List Content */}
      <div className="space-y-2 py-2 overflow-y-auto pr-1 flex-1">
        {displayedTasks.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center text-white/40">
            <CheckCircle2 className="w-8 h-8 mb-2 stroke-1" />
            <p className="text-xs">
              {tasks.length === 0
                ? 'No tasks added yet. Add a task to start focusing!'
                : 'No tasks in this view.'}
            </p>
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
            />
          ))
        )}
      </div>
    </div>
  );
};

