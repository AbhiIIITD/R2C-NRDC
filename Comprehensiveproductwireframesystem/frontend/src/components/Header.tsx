import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { Bell, LogOut, User, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// Header Component (for authenticated users)
// ============================================================================

interface HeaderProps {
  title?: string;
  showNotifications?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showNotifications = true,
}) => {
  const { user, logout } = useAuth();
  const { notifications, getUnreadNotifications, markNotificationAsRead } =
    useAppData();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const unreadNotifications = user ? getUnreadNotifications(user.id) : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (notifId: string) => {
    markNotificationAsRead(notifId);
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-full px-6 py-4 flex justify-between items-center">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold text-neutral-950">
            R2C.AI
          </Link>
          {title && <span className="text-neutral-600">/ {title}</span>}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          {showNotifications && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute top-1 right-1 bg-neutral-900 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadNotifications.length > 9
                        ? '9+'
                        : unreadNotifications.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
                {unreadNotifications.length === 0 ? (
                  <div className="p-4 text-center text-neutral-500 text-sm">
                    No new notifications
                  </div>
                ) : (
                  <>
                    {unreadNotifications.slice(0, 10).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id)}
                        className="px-4 py-3 hover:bg-neutral-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-sm text-neutral-950">
                          {notif.title}
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">
                          {notif.message}
                        </div>
                        <div className="text-xs text-neutral-500 mt-2">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm font-medium text-neutral-900 ring-1 ring-neutral-300">
                    {user.name.charAt(0)}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-4 py-3 border-b">
                  <div className="font-medium text-sm text-neutral-950">
                    {user.name}
                  </div>
                  <div className="text-xs text-neutral-500">{user.role}</div>
                </div>
                <DropdownMenuItem asChild>
                  <Link to={`/${user.role}/profile`}>
                    <User className="w-4 h-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-neutral-800">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// Public Header (for unauthenticated users)
// ============================================================================

interface PublicHeaderProps {
  showAuth?: boolean;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  showAuth = true,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-neutral-950">
          R2C.AI
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          {showAuth && (
            <>
              <Link
                to="/login"
                className="text-neutral-600 hover:text-neutral-950 font-medium text-sm"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="bg-neutral-900 text-white px-4 py-2 rounded-md hover:bg-neutral-800 active:bg-black font-medium text-sm transition-all duration-150 hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && showAuth && (
        <div className="md:hidden border-t border-neutral-200 py-4 px-6">
          <Link
            to="/login"
            className="block py-2 text-neutral-600 hover:text-neutral-950"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="block py-2 text-neutral-600 hover:text-neutral-950"
          >
            Sign Up
          </Link>
        </div>
      )}
    </header>
  );
};
