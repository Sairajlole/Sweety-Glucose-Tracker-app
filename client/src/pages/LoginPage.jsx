import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import AuthLayout, { AuthField, AuthFooterLink } from '../components/AuthLayout';
import Spinner from '../components/Spinner';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, isAuthenticated, initialising } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!initialising && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!form.email.trim()) nextErrors.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!form.password) nextErrors.password = 'Please enter your password.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');

    try {
      await login({ email: form.email.trim(), password: form.password });
      const redirectTo = location.state?.from || '/';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to log in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to review your glucose readings.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError ? (
          <div
            className="flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200"
            role="alert"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <p className="text-sm font-medium text-rose-700">{formError}</p>
          </div>
        ) : null}

        <AuthField id="login-email" label="Email address" error={errors.email} icon={Mail}>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            className={`input ${errors.email ? 'input-error' : ''}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
            aria-invalid={errors.email ? 'true' : 'false'}
            required
          />
        </AuthField>

        <AuthField id="login-password" label="Password" error={errors.password} icon={Lock}>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="Enter your password"
            value={form.password}
            onChange={update('password')}
            aria-invalid={errors.password ? 'true' : 'false'}
            required
          />
        </AuthField>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner className="h-4 w-4 text-white" /> : null}
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <AuthFooterLink text="New to Sweety?" linkText="Create an account" to="/register" />
    </AuthLayout>
  );
}
