import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import Spinner from './Spinner';

/** Blocks unauthenticated access and remembers where the user was heading. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initialising } = useAuth();
  const location = useLocation();

  if (initialising) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8 text-brand-600" />
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Layout>{children}</Layout>;
}
