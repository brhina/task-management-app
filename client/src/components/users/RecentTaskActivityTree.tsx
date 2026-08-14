import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CornerDownRight, FolderKanban, ChevronDown, ChevronRight, Layers, ExternalLink } from 'lucide-react';
import SubtaskDetailModal from '../tasks/SubtaskDetailModal';

export interface TaskActivityItem {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  projectId?: {
    _id?: string;
    name?: string;
  };
  assignedTo?: {
    _id?: string;
    name?: string;
    email?: string;
    profileImageUrl?: string;
  };
  parentTaskId?: {
    _id?: string;
    title?: string;
    status?: string;
    priority?: string;
    projectId?: { _id?: string; name?: string };
    assignedTo?: { _id?: string; name?: string };
  } | string | null;
  updatedAt?: string;
}

interface GroupedTaskNode {
  parent: {
    _id: string;
    title: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    projectId?: { _id?: string; name?: string };
    assignedTo?: { _id?: string; name?: string };
    isVirtualParent?: boolean;
  };
  subtasks: TaskActivityItem[];
}

function extractIdString(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed && trimmed !== '[object Object]' ? trimmed : null;
  }
  if (typeof val === 'object' && val !== null) {
    if (val.$oid && typeof val.$oid === 'string') {
      return val.$oid.trim();
    }
    if (val._id) {
      return extractIdString(val._id);
    }
    if (val.id) {
      return extractIdString(val.id);
    }
    if (typeof val.toString === 'function') {
      const str = val.toString().trim();
      return str && str !== '[object Object]' ? str : null;
    }
  }
  return null;
}

function getTaskParentId(t: any): string | null {
  return extractIdString(t.parentTaskId || t.parentId || t.parent);
}

function getTaskId(t: any): string {
  return extractIdString(t._id || t.id) || String(t._id || t.id || '');
}

interface RecentTaskActivityTreeProps {
  tasks: TaskActivityItem[];
  title?: string;
  emptyMessage?: string;
  showAssignee?: boolean;
}

export default function RecentTaskActivityTree({
  tasks = [],
  title = 'Recent Task Activity',
  emptyMessage = 'No recent task activity recorded.',
  showAssignee = false,
}: RecentTaskActivityTreeProps) {
  // State for expanded parent tasks (keyed by parent._id)
  const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);

  const groupedTasks = useMemo(() => {
    const groups: GroupedTaskNode[] = [];
    const parentMap = new Map<string, GroupedTaskNode>();

    // First pass: register all top-level tasks (tasks without parentTaskId)
    tasks.forEach((t) => {
      const parentId = getTaskParentId(t);
      if (!parentId) {
        const idStr = getTaskId(t);
        const node: GroupedTaskNode = {
          parent: {
            _id: idStr,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            projectId: t.projectId,
            assignedTo: t.assignedTo,
            isVirtualParent: false,
          },
          subtasks: [],
        };
        parentMap.set(idStr, node);
        groups.push(node);
      }
    });

    // Second pass: attach subtasks to their parent task, creating a parent container node if necessary
    tasks.forEach((t) => {
      const parentId = getTaskParentId(t);
      if (parentId) {
        const parentObj = typeof t.parentTaskId === 'object' && t.parentTaskId !== null ? t.parentTaskId : null;

        let node = parentMap.get(parentId);
        if (!node) {
          node = {
            parent: {
              _id: parentId,
              title: parentObj?.title || 'Parent Task',
              status: parentObj?.status,
              priority: parentObj?.priority,
              projectId: parentObj?.projectId || t.projectId,
              assignedTo: parentObj?.assignedTo || t.assignedTo,
              isVirtualParent: true,
            },
            subtasks: [],
          };
          parentMap.set(parentId, node);
          groups.push(node);
        }
        node.subtasks.push(t);
      }
    });

    return groups;
  }, [tasks]);

  const toggleExpand = (parentId: string) => {
    setExpandedState((prev) => ({
      ...prev,
      [parentId]: prev[parentId] === undefined ? false : !prev[parentId],
    }));
  };

  return (
    <div className="card">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        {title}
      </div>

      {groupedTasks.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-400 italic">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedTasks.map(({ parent, subtasks }) => {
            const hasSubtasks = subtasks.length > 0;
            // Default to expanded (true) unless explicitly collapsed by user
            const isExpanded = expandedState[parent._id] !== false;

            return (
              <div
                key={parent._id}
                className="rounded-xl border border-slate-200/80 bg-slate-50/50 overflow-hidden shadow-2xs transition-all"
              >
                {/* Parent Task Header Row (Top Level) */}
                <div className="flex items-center justify-between p-2.5 bg-white border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Expand / Collapse Button if task has subtasks */}
                    {hasSubtasks ? (
                      <button
                        type="button"
                        onClick={() => toggleExpand(parent._id)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                        title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="w-5 shrink-0" />
                    )}

                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        parent.status === 'Completed'
                          ? 'bg-emerald-500'
                          : parent.status === 'In Progress'
                          ? 'bg-sky-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
                    {parent._id && /^[0-9a-fA-F]{24}$/.test(parent._id) ? (
                      <Link
                        to={`/tasks/${parent._id}`}
                        className="font-bold text-xs text-slate-800 hover:text-primary transition-colors truncate max-w-[260px]"
                      >
                        {parent.title}
                      </Link>
                    ) : (
                      <span className="font-bold text-xs text-slate-800 truncate max-w-[260px]">
                        {parent.title}
                      </span>
                    )}

                    {/* Subtasks Count Badge */}
                    {hasSubtasks && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(parent._id)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors shrink-0"
                      >
                        <Layers className="w-3 h-3" />
                        <span>{subtasks.length} {subtasks.length === 1 ? 'subtask' : 'subtasks'}</span>
                      </button>
                    )}

                    {parent.isVirtualParent && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-200/60 uppercase tracking-wider shrink-0">
                        Parent Task
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {parent.priority && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-slate-700">
                        {parent.priority}
                      </span>
                    )}
                    {parent.status && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-slate-700">
                        {parent.status}
                      </span>
                    )}
                    {showAssignee && parent.assignedTo?.name && (
                      <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">
                        {parent.assignedTo.name}
                      </span>
                    )}
                    {parent.projectId?.name && (
                      <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">
                        {parent.projectId.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Nested Child Subtasks (Indented under parent task) */}
                {hasSubtasks && isExpanded && (
                  <div className="bg-slate-50/60 p-2.5 pl-6 ml-6 border-l-2 border-indigo-400/40 space-y-2 my-1.5 rounded-r-xl">
                    {subtasks.map((st) => {
                      const stParentId = getTaskParentId(st) || parent._id;
                      const hasValidParent = stParentId && /^[0-9a-fA-F]{24}$/.test(stParentId);
                      return (
                        <div
                          key={st._id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs hover:border-primary/50 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0 pl-0.5">
                            <CornerDownRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            {/* <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase tracking-wider shrink-0">
                              Subtask
                            </span> */}

                            <div
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                st.status === 'Completed'
                                  ? 'bg-emerald-500'
                                  : st.status === 'In Progress'
                                  ? 'bg-sky-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setActiveSubtaskId(st._id)}
                              className="font-semibold text-xs text-slate-800 hover:text-primary transition-colors truncate max-w-[240px] text-left cursor-pointer"
                              title="Click to view subtask details"
                            >
                              {st.title}
                            </button>
                            {hasValidParent && (
                              <Link
                                to={`/tasks/${stParentId}?subtaskId=${st._id}`}
                                className="text-slate-400 hover:text-primary transition-colors p-0.5 shrink-0"
                                title="Open in task workspace"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {st.priority && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-slate-700">
                                {st.priority}
                              </span>
                            )}
                            {st.status && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-slate-700">
                                {st.status}
                              </span>
                            )}
                            {showAssignee && st.assignedTo?.name && (
                              <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">
                                {st.assignedTo.name}
                              </span>
                            )}
                            {st.projectId?.name && (
                              <span className="text-[10px] text-slate-400 hidden sm:inline font-medium">
                                {st.projectId.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Subtask Detail Modal */}
      {activeSubtaskId && (
        <SubtaskDetailModal
          isOpen={!!activeSubtaskId}
          subtaskId={activeSubtaskId}
          onClose={() => setActiveSubtaskId(null)}
          onUpdated={() => setActiveSubtaskId(null)}
          isAdmin={true}
          members={[]}
        />
      )}
    </div>
  );
}
