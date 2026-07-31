import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import api from '../../utils/axios';
import { apiPaths } from '../../utils/apiPaths';
import type { Task, TodoItem } from '../../types';
import { ListTree, GripVertical, Plus, X, Check } from 'lucide-react';

interface Props {
  parentId: string;
  isAdmin: boolean;
  detailBasePath: string;
  onProgressChange?: () => void;
}

function SortableRow({
  task,
  detailBasePath,
  isAdmin,
  onChecklistUpdate,
}: {
  task: Task;
  detailBasePath: string;
  isAdmin: boolean;
  onChecklistUpdate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [updating, setUpdating] = useState(false);

  const completedCount = task.todoCheckList?.filter((t) => t.isCompleted).length || 0;
  const totalCount = task.todoCheckList?.length || 0;

  const handleToggleItem = async (index: number, isCompleted: boolean) => {
    if (!task.todoCheckList) return;
    const updated = [...task.todoCheckList];
    updated[index] = { ...updated[index], isCompleted };
    try {
      setUpdating(true);
      await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', task._id), {
        todoCheckList: updated,
      });
      onChecklistUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    const newItemObj: TodoItem = { text: newItem.trim(), isCompleted: false };
    try {
      setUpdating(true);
      await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', task._id), {
        todoCheckList: [...(task.todoCheckList || []), newItemObj],
      });
      setNewItem('');
      onChecklistUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteItem = async (index: number) => {
    if (!task.todoCheckList) return;
    try {
      setUpdating(true);
      await api.put(apiPaths.TASKS.UPDATE_TASK_CHECKLIST.replace(':id', task._id), {
        todoCheckList: task.todoCheckList.filter((_, i) => i !== index),
      });
      onChecklistUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-gray-200 bg-white overflow-hidden"
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        {isAdmin && (
          <button type="button" className="text-slate-400 cursor-grab" {...attributes} {...listeners}>
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <Link
          to={`${detailBasePath}/${task._id}`}
          className="flex-1 truncate text-slate-700 hover:text-primary text-sm font-medium"
        >
          {task.title}
        </Link>
        {totalCount > 0 && (
          <span className="text-[10px] text-slate-500 tabular-nums">
            {completedCount}/{totalCount}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-2 pb-2 border-t border-gray-100">
          {totalCount > 0 && (
            <div className="mt-2 mb-1">
              <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-0.5 mt-1">
            {task.todoCheckList?.map((todo, index) => (
              <div
                key={index}
                className="flex items-center gap-2 group px-1.5 py-1 rounded hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={todo.isCompleted}
                  onChange={(e) => handleToggleItem(index, e.target.checked)}
                  disabled={updating}
                  className="h-3.5 w-3.5 shrink-0 text-primary focus:ring-primary border-gray-300 rounded cursor-pointer disabled:opacity-50"
                />
                <span
                  className={`flex-1 text-xs ${todo.isCompleted ? 'line-through text-slate-400' : 'text-slate-600'}`}
                >
                  {todo.text}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteItem(index)}
                    disabled={updating}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-400 hover:text-rose-500 transition-opacity disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <form onSubmit={handleAddItem} className="mt-2 flex gap-1.5">
              <input
                type="text"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Add item..."
                className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/30"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newItem.trim() || updating}
                className="px-2 py-1 text-xs text-primary hover:text-primary-hover disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

export default function TaskSubtasks({
  parentId,
  isAdmin,
  detailBasePath,
  onProgressChange,
}: Props) {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const sensors = useSensors(useSensor(PointerSensor));

  const fetchSubtasks = useCallback(async () => {
    try {
      const res = await api.get(apiPaths.TASKS.SUBTASKS.replace(':id', parentId));
      setSubtasks(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [parentId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subtasks.findIndex((t) => t._id === active.id);
    const newIndex = subtasks.findIndex((t) => t._id === over.id);
    const next = arrayMove(subtasks, oldIndex, newIndex);
    setSubtasks(next);
    try {
      await api.put(apiPaths.TASKS.REORDER_SUBTASKS.replace(':id', parentId), {
        orderedIds: next.map((t) => t._id),
      });
    } catch (err) {
      console.error(err);
      fetchSubtasks();
    }
  };

  const addSubtask = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !isAdmin) return;
    try {
      const parentRes = await api.get(
        apiPaths.TASKS.GET_TASK_BY_ID.replace(':id', parentId),
      );
      const parent = parentRes.data.data;
      const assignedTo =
        typeof parent.assignedTo === 'object'
          ? parent.assignedTo._id
          : parent.assignedTo;
      await api.post(apiPaths.TASKS.CREATE_TASK, {
        title: title.trim(),
        description: `Subtask of ${parent.title}`,
        dueDate: parent.dueDate,
        assignedTo,
        parentTaskId: parentId,
        projectId:
          typeof parent.projectId === 'object'
            ? parent.projectId?._id
            : parent.projectId,
        priority: parent.priority || 'Medium',
      });
      setTitle('');
      await fetchSubtasks();
      onProgressChange?.();
    } catch (err) {
      console.error(err);
    }
  };

  const avg =
    subtasks.length > 0
      ? Math.round(
          subtasks.reduce((s, t) => s + (t.progress || 0), 0) / subtasks.length,
        )
      : 0;

  return (
    <div className="card">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
        <ListTree className="w-4 h-4" /> Subtasks
        {subtasks.length > 0 && (
          <span className="text-xs font-normal text-slate-500">
            ({avg}% progress)
          </span>
        )}
      </h3>
      {subtasks.length > 0 && (
        <div className="h-1.5 rounded-full bg-gray-100 mb-3 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${avg}%` }}
          />
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={subtasks.map((t) => t._id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5 mb-3">
            {subtasks.length === 0 && (
              <li className="text-sm text-slate-500">No subtasks.</li>
            )}
            {subtasks.map((t) => (
              <SortableRow
                key={t._id}
                task={t}
                detailBasePath={detailBasePath}
                isAdmin={isAdmin}
                onChecklistUpdate={fetchSubtasks}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {isAdmin && (
        <form onSubmit={addSubtask} className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New subtask title"
            className="flex-1 input-field text-sm"
          />
          <button
            type="submit"
            className="btn-primary inline-flex items-center gap-1 text-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}
    </div>
  );
}
