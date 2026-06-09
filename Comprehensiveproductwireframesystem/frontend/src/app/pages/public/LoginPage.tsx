import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDashboardPath } from '@/components/ProtectedRoute';
import { MOCK_USERS } from '@/lib/mockData';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader } from 'lucide-react';

// ============================================================================
// Login Page
// ============================================================================

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setSubmitError(null);
  };

  // Handle form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.email || !formData.password) {
      setSubmitError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.email, formData.password);
      if (formData.rememberMe) {
        localStorage.setItem('rememberEmail', formData.email);
      }
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const { role } = JSON.parse(savedUser);
        navigate(getRoleDashboardPath(role), { replace: true });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  // Quick login for demo purposes
  const handleQuickLogin = async (userEmail: string) => {
    setSubmitError(null);
    try {
      await login(userEmail, 'password');
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const { role } = JSON.parse(savedUser);
        navigate(getRoleDashboardPath(role), { replace: true });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-neutral-950 mb-2">R2C.AI</div>
          <div className="text-neutral-600">Research to Commercialization Platform</div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-xl shadow-black/10 p-8 border border-neutral-200">
          <h1 className="text-2xl font-bold text-neutral-950 mb-2">Welcome Back</h1>
          <p className="text-neutral-600 text-sm mb-6">Sign in to your account</p>

          {/* Error Alert */}
          {(submitError || error) && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError || error}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
              <Label htmlFor="email" className="text-neutral-800">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
              />
            </div>

            {/* Password Field */}
            <div>
              <Label htmlFor="password" className="text-neutral-800">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                className="mt-1 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-500 focus-visible:border-neutral-900 focus-visible:ring-neutral-900/20"
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-neutral-700">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-neutral-400 accent-neutral-900"
                />
                <span>Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-neutral-800 hover:text-neutral-950 underline-offset-4 hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-neutral-900 hover:bg-neutral-800 active:bg-black disabled:bg-neutral-300 disabled:text-neutral-600 text-white font-semibold py-2 shadow-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Signup Link */}
          <div className="text-center text-sm text-neutral-600 mt-6 pt-6 border-t border-neutral-200">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-neutral-900 hover:text-black underline-offset-4 hover:underline font-medium"
            >
              Create one
            </Link>
          </div>
        </div>

        {/* Demo Access Section */}
        <div className="mt-6 p-4 bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="text-sm font-semibold text-neutral-900 mb-3">
            Quick Demo Login
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleQuickLogin(
                  Object.values(MOCK_USERS).find((u) => u.role === 'researcher')
                    ?.email || ''
                )
              }
              disabled={isLoading}
              className="text-xs border-neutral-300 text-neutral-900 hover:bg-neutral-100 hover:text-neutral-950"
            >
              Researcher
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleQuickLogin(
                  Object.values(MOCK_USERS).find((u) => u.role === 'industry')
                    ?.email || ''
                )
              }
              disabled={isLoading}
              className="text-xs border-neutral-300 text-neutral-900 hover:bg-neutral-100 hover:text-neutral-950"
            >
              Industry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleQuickLogin(
                  Object.values(MOCK_USERS).find((u) => u.role === 'admin')
                    ?.email || ''
                )
              }
              disabled={isLoading}
              className="text-xs border-neutral-300 text-neutral-900 hover:bg-neutral-100 hover:text-neutral-950"
            >
              Admin
            </Button>
          </div>
          <p className="text-xs text-neutral-700 mt-2">
            Use password: <span className="font-mono font-bold">password</span>
          </p>
        </div>
      </div>
    </div>
  );
}
