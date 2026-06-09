import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { Home, CheckSquare, Calendar, FileCheck, Activity, BarChart3, Bell, User, Menu, ClipboardList, MessageSquare, LogOut, HeartHandshake } from 'lucide-react';

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navItems = [
    { path: '/admin', icon: Home, label: 'Dashboard' },
    { path: '/admin/review-queue', icon: CheckSquare, label: 'Review Queue' },
    { path: '/admin/problems', icon: ClipboardList, label: 'Problem Statements' },
    { path: '/admin/interests', icon: HeartHandshake, label: 'Interests Expressed' },
    { path: '/admin/meetings', icon: Calendar, label: 'Meeting Management' },
    { path: '/admin/licensing', icon: FileCheck, label: 'Licensing Management' },
    { path: '/admin/copilot', icon: MessageSquare, label: 'AI Copilot' },
    { path: '/admin/audit-logs', icon: Activity, label: 'Audit Logs' },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-transparent flex">
      {/* Sidebar Navigation */}
      <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-neutral-200/80 bg-white/95 backdrop-blur-sm shadow-[1px_0_0_rgba(16,24,40,0.02),8px_0_24px_-16px_rgba(16,24,40,0.08)]">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-neutral-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-900 to-neutral-700 text-sm font-bold text-white shadow-sm">
            R
          </div>
          <div>
            <div className="text-[0.95rem] font-semibold tracking-tight text-neutral-900">R2C.AI</div>
            <div className="text-[0.7rem] font-medium uppercase tracking-wider text-neutral-400">Admin Portal</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path}>
                <div
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                    active
                      ? 'bg-neutral-900 text-white shadow-[0_4px_12px_-4px_rgba(16,24,40,0.35)]'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white/90" />}
                  <item.icon size={18} className={active ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-700'} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-100 p-3">
          <div className="px-3 pb-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-neutral-400">Admin Account</div>
          <Link to="/admin/profile">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-600 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900">
              <User size={18} className="text-neutral-400" />
              <span className="font-medium">Profile Settings</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
          <div className="px-6 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
                <Menu size={20} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/admin/notifications">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
                  <Bell size={19} />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-neutral-900 ring-2 ring-white"></span>
                </div>
              </Link>
              <button
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-500 ring-2 ring-white shadow-sm"></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
