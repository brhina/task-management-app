import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, Trash2, X, Info, CheckCircle2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message?: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  type?: 'confirm' | 'alert';
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
  type = 'confirm',
  loading = false,
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const iconBg =
    variant === 'danger'
      ? 'bg-rose-100 text-rose-600 border-rose-200'
      : variant === 'warning'
      ? 'bg-amber-100 text-amber-600 border-amber-200'
      : variant === 'success'
      ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
      : 'bg-indigo-100 text-indigo-600 border-indigo-200';

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/20'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500/20'
      : variant === 'success'
      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500/20'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs focus:ring-indigo-500/20';

  const IconComp =
    variant === 'danger'
      ? Trash2
      : variant === 'warning'
      ? AlertTriangle
      : variant === 'success'
      ? CheckCircle2
      : Info;

  const handleAction = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => !loading && onClose()}
        />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200/80 animate-in zoom-in-95 duration-150">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl border shrink-0 ${iconBg}`}>
                <IconComp className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800">{title}</h3>
                {message && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>}
                {description && <div className="mt-2.5 text-xs">{description}</div>}
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              {type === 'confirm' && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={handleAction}
                disabled={loading}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${confirmBtnClass}`}
              >
                {loading
                  ? 'Processing...'
                  : type === 'alert'
                  ? confirmText === 'Delete'
                    ? 'OK'
                    : confirmText
                  : confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
