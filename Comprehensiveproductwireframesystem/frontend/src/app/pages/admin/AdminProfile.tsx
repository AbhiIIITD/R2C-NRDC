import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';

export function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl text-neutral-800 mb-2">Admin Profile</h1>
        <p className="text-sm text-neutral-600">
          Account context for the NRDC review, publishing, and commercialization workflow.
        </p>
      </div>

      <WireframeCard title="Account Details" className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-neutral-500 mb-1">Name</div>
              <div className="text-neutral-800">{user?.name || 'NRDC Admin'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Role</div>
              <div className="text-neutral-800">Admin</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Email</div>
              <div className="text-neutral-800">{user?.email || 'admin@nrdc.org'}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500 mb-1">Organization</div>
              <div className="text-neutral-800">{user?.organization || 'NRDC'}</div>
            </div>
          </div>

          <div className="border-t-2 border-neutral-300 pt-4 flex justify-end">
            <WireframeButton label="Logout" variant="primary" onClick={handleLogout} />
          </div>
        </div>
      </WireframeCard>
    </div>
  );
}
