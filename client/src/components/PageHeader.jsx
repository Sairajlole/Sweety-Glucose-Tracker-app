export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
      </div>
      {(actions || children) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions || children}</div>
      )}
    </div>
  );
}
