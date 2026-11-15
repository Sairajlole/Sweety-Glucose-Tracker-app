import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  Droplet,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/readings', label: 'Readings', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: PieChart },
];

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
        <Droplet className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-base font-bold leading-tight text-slate-900">Sweety</span>
        <span className="block text-[11px] font-medium leading-tight text-slate-500">
          Glucose Tracker
        </span>
      </span>
    </div>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            ].join(' ')
          }
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard({ compact = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div
      className={
        compact
          ? 'flex items-center gap-3'
          : 'rounded-xl border border-slate-200 bg-slate-50/70 p-3'
      }
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
        {initials(user?.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
        title="Log out"
        aria-label="Log out"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Layout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <div className="px-1">
          <Brand />
        </div>

        <div className="mt-8 flex-1">
          <NavItems />
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-brand-50 p-3">
            <div className="flex items-center gap-2 text-brand-700">
              <Activity className="h-4 w-4" aria-hidden="true" />
              <p className="text-xs font-semibold">4 readings a day</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-brand-700/80">
              Morning, after breakfast, lunch and dinner.
            </p>
          </div>
          <UserCard />
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* ---------- Mobile drawer ---------- */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] animate-fade-in flex-col bg-white px-4 py-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-8 flex-1">
              <NavItems onNavigate={() => setDrawerOpen(false)} />
            </div>
            <UserCard />
          </div>
        </div>
      ) : null}

      {/* ---------- Content ---------- */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
