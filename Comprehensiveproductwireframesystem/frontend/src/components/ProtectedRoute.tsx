import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/index';

// ============================================================================
// Protected Route Component
// ============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required roles are specified
  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// ============================================================================
// Role-Based Redirect
// ============================================================================

/**
 * Redirect user to dashboard based on their role
 * Used after login to route users to their appropriate dashboard
 */
export const getRoleDashboardPath = (role: UserRole): string => {
  switch (role) {
    case 'researcher':
      return '/researcher';
    case 'industry':
      return '/industry';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
};

// ============================================================================
// Role-Based Redirect Component
// ============================================================================

export const RoleRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const dashboardPath = getRoleDashboardPath(user.role);
  return <Navigate to={dashboardPath} replace />;
};

// ============================================================================
// Unauthorized Page
// ============================================================================

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 4v2M6.343 3.665c.886-.887 2.318-.887 3.203 0l10.83 10.83c.884.884.884 2.319 0 3.203l-10.83 10.83c-.885.886-2.317.886-3.203 0L2.515 17.695c-.884-.884-.884-2.319 0-3.203L13.345 3.665z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          403 - Unauthorized
        </h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Please contact your
          administrator if you believe this is a mistake.
        </p>
        <a
          href="/"
          className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
};
