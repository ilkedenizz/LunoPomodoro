import React, { useState } from 'react';
import { CheckCircle2, Circle, Trash2, Edit2, Check, Target } from 'lucide-react';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  onToggleComplete: (id: string) => void;
  onSelectActive: (id: string) => void;
  onEditTask: (id: string, newTitle: string) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  onToggleComplete,
  onSelectActive,
  onEditTask,
  onDeleteTask,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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
          ? 'bg-white/15 border-white/40 ring-1 ring-white/30 shadow-lg'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      {/* Left Area: Checkbox + Title / Edit Input */}
      <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
        {/* Toggle Complete Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          aria-label={task.completed ? 'Mark task as incomplete' : 'Mark task as completed'}
          className="text-white/60 hover:text-white transition-colors shrink-0 focus:outline-none"
        >
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
          ) : (
            <Circle className="w-5 h-5 text-white/40 hover:text-white/80" />
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
              className="w-full bg-white/10 border border-white/30 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
            />
            <button
              onClick={handleSaveEdit}
              aria-label="Save title"
              className="p-1 text-emerald-300 hover:text-emerald-200"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            className="flex flex-col min-w-0 cursor-pointer select-none"
            title="Double-click to edit"
          >
            <span
              className={`text-xs sm:text-sm font-medium transition-all line-clamp-1 ${
                task.completed ? 'line-through text-white/40' : 'text-white/90'
              }`}
            >
              {task.title}
            </span>
            {task.pomodoros > 0 && (
              <span className="text-[10px] text-white/50 font-mono">
                {task.pomodoros} {task.pomodoros === 1 ? 'pomodoro' : 'pomodoros'}
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
            aria-label={isActive ? 'Active focusing task' : 'Focus on this task'}
            title={isActive ? 'Currently Focusing' : 'Set as Active Task'}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
              isActive
                ? 'bg-white text-black font-semibold shadow-glow'
                : 'text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 sm:opacity-100'
            }`}
          >
            <Target className={`w-3.5 h-3.5 ${isActive ? 'text-black' : ''}`} />
            {isActive && <span className="text-[10px] hidden sm:inline">Focusing</span>}
          </button>
        )}

        {/* Edit Button */}
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            aria-label="Edit task title"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
            title="Edit task"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete Action with inline confirm */}
        {isConfirmingDelete ? (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onDeleteTask(task.id)}
              className="px-2 py-0.5 rounded bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-semibold transition-all"
            >
              Delete
            </button>
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className="px-1.5 py-0.5 text-white/50 hover:text-white text-[10px]"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsConfirmingDelete(true)}
            aria-label="Delete task"
            className="p-1.5 rounded-lg text-white/40 hover:text-red-300 hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all"
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
 
