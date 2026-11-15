import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const TONE = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-200', iconColor: 'text-emerald-600' },
  error: { icon: XCircle, ring: 'ring-rose-200', iconColor: 'text-rose-600' },
  info: { icon: Info, ring: 'ring-slate-200', iconColor: 'text-slate-500' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message, type = 'success') => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, message, type }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      notify,
      success: (message) => notify(message, 'success'),
      error: (message) => notify(message, 'error'),
      info: (message) => notify(message, 'info'),
    }),
    [notify]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const tone = TONE[toast.type] || TONE.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl bg-white px-4 py-3 shadow-lg ring-1 ${tone.ring} animate-fade-in`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconColor}`} aria-hidden="true" />
              <p className="flex-1 text-sm font-medium text-slate-700">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
