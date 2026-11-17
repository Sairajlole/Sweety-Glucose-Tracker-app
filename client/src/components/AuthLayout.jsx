import { Link } from 'react-router-dom';
import { Activity, Droplet, LineChart, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { icon: Activity, text: 'Log up to four readings a day - morning, after meals and after dinner.' },
  { icon: LineChart, text: 'See daily, month-to-date and previous month reports at a glance.' },
  { icon: ShieldCheck, text: 'Your readings stay private to your account, always.' },
];

/** Left-hand brand panel shared by the login and registration screens. */
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <aside className="relative hidden w-1/2 max-w-xl flex-col justify-between bg-brand-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Droplet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold leading-tight">Sweety</p>
            <p className="text-xs text-brand-100">Blood Glucose Tracker</p>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-snug">
            Simple, steady
            <br />
            glucose tracking.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-50/90">
            Record your daily readings and understand your patterns - without spreadsheets or
            paperwork.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm leading-relaxed text-brand-50/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-brand-100/70">
          Sweety is a tracking tool and does not provide medical advice.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-1/2">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Droplet className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-bold leading-tight text-slate-900">Sweety</p>
              <p className="text-xs text-slate-500">Blood Glucose Tracker</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p> : null}

          <div className="mt-7">{children}</div>

          <p className="mt-8 text-center text-xs text-slate-400">
            © 2026 Sweety · A tracking tool, not medical advice
          </p>
        </div>
      </main>
    </div>
  );
}

/** Reusable field with label, error and optional trailing element. */
export function AuthField({ id, label, error, icon: Icon, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
        ) : null}
        <div className={Icon ? 'pl-9' : ''}>{children}</div>
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthFooterLink({ text, linkText, to }) {
  return (
    <p className="mt-6 text-center text-sm text-slate-500">
      {text}{' '}
      <Link to={to} className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
        {linkText}
      </Link>
    </p>
  );
}
