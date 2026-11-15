/** Friendly placeholder for empty lists and empty report periods. */
export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      {Icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <Icon className="h-6 w-6 text-brand-600" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
