import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

function Modal({ isOpen, onClose, title, subtitle, children, footer, maxWidth = 'sm:max-w-2xl' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div
          ref={overlayRef}
          className="fixed inset-0 bg-slate-900/80 transition-opacity"
          onClick={onClose}
        />
        <div className={`relative transform overflow-hidden rounded-xl bg-slate-800 border border-slate-700 text-left shadow-xl transition-all sm:my-8 w-full ${maxWidth}`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-700/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-4 max-h-[75vh] overflow-y-auto">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
