import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link to="/" className="btn-primary mt-6">
        <Home className="h-4 w-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  );
}
