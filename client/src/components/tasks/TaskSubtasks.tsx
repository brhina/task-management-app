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
import type { Task } from '../../types';
import { ListTree, GripVertical, Plus } from 'lucide-react';

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
}: {
  task: Task;
  detailBasePath: string;
  isAdmin: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-sm"
    >
      {isAdmin && (
        <button type="button" className="text-slate-500 cursor-grab" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <Link
        to={`${detailBasePath}/${task._id}`}
        className="flex-1 truncate text-slate-300 hover:text-cyan-400"
      >
        {task.title}
      </Link>
      <span className="text-xs text-slate-500">{task.status}</span>
      <span className="text-xs text-slate-400 w-10 text-right">{task.progress}%</span>
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
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
        <ListTree className="w-4 h-4" /> Subtasks
        {subtasks.length > 0 && (
          <span className="text-xs font-normal text-slate-500">
            ({avg}% rollup)
          </span>
        )}
      </h3>
      {subtasks.length > 0 && (
        <div className="h-1.5 rounded-full bg-slate-800 mb-3 overflow-hidden">
          <div
            className="h-full bg-cyan-500/70"
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
            className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-sm text-slate-200"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-600/80 px-2 py-1.5 text-sm text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </form>
      )}
    </div>
  );
}
