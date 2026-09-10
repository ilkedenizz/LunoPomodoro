import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface TaskInputProps {
  onAddTask: (title: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export const TaskInput: React.FC<TaskInputProps> = ({
  onAddTask,
  onCancel,
  autoFocus = true,
}) => {
  const [title, setTitle] = useState('');

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
      <div className="flex items-center space-x-2 p-2 px-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md focus-within:ring-2 focus-within:ring-white/40 transition-all">
        <Plus className="w-4 h-4 text-white/50 shrink-0" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          autoFocus={autoFocus}
          className="w-full bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
          aria-label="New task title"
        />
        {title.length > 0 && (
          <button
            type="submit"
            aria-label="Add task"
            className="px-2.5 py-1 rounded-lg bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all shrink-0"
          >
            Add
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel adding task"
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </form>
  );
};
 
