import { Outlet, Link } from 'react-router';
import { WireframeButton } from '../components/WireframeButton';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-900 to-neutral-700 text-sm font-bold text-white shadow-sm">
              R
            </div>
            <div className="text-xl font-semibold tracking-tight text-neutral-900">R2C.AI</div>
          </div>
          <div className="flex gap-3">
            <Link to="/login">
              <WireframeButton label="Login" variant="ghost" />
            </Link>
            <Link to="/signup">
              <WireframeButton label="Sign Up" variant="primary" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 bg-white/70 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-sm text-neutral-800 mb-2">About</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
            </div>
            <div>
              <div className="text-sm text-neutral-800 mb-2">Resources</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
            </div>
            <div>
              <div className="text-sm text-neutral-800 mb-2">Support</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
            </div>
            <div>
              <div className="text-sm text-neutral-800 mb-2">Legal</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
              <div className="text-xs text-neutral-500">Footer Link</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
