import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Mail, User } from 'lucide-react';
import AuthLayout, { AuthField, AuthFooterLink } from '../components/AuthLayout';
import Spinner from '../components/Spinner';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register, isAuthenticated, initialising } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
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
    if (!form.name.trim()) nextErrors.name = 'Please enter your full name.';
    else if (form.name.trim().length < 2) {
      nextErrors.name = 'Name must be at least 2 characters long.';
    }

    if (!form.email.trim()) nextErrors.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.password) nextErrors.password = 'Please enter a password.';
    else if (form.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters long.';
    }

    // Confirm-password is a frontend-only rule; the API never receives it.
    if (!form.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to create your account. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start tracking your blood glucose in a few seconds."
    >
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

        <AuthField id="register-name" label="Full name" error={errors.name} icon={User}>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="Sweety Sharma"
            value={form.name}
            onChange={update('name')}
            aria-invalid={errors.name ? 'true' : 'false'}
            required
          />
        </AuthField>

        <AuthField id="register-email" label="Email address" error={errors.email} icon={Mail}>
          <input
            id="register-email"
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

        <AuthField id="register-password" label="Password" error={errors.password} icon={Lock}>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={`input ${errors.password ? 'input-error' : ''}`}
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update('password')}
            aria-invalid={errors.password ? 'true' : 'false'}
            required
          />
        </AuthField>

        <AuthField
          id="register-confirm-password"
          label="Confirm password"
          error={errors.confirmPassword}
          icon={Lock}
        >
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            aria-invalid={errors.confirmPassword ? 'true' : 'false'}
            required
          />
        </AuthField>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? <Spinner className="h-4 w-4 text-white" /> : null}
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <AuthFooterLink
        text="Already have an account?"
        linkText="Log in instead"
        to="/login"
      />
    </AuthLayout>
  );
}
