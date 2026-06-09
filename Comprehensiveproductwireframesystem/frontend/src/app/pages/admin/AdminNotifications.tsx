import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { WireframeCard } from '../../components/WireframeCard';
import { Bell, CheckSquare } from 'lucide-react';

export function AdminNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, markNotificationAsRead } = useAppData();

  const adminNotifications = notifications
    .filter((notification) => notification.userId === (user?.id || 'admin1') || notification.userId === 'admin1')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const markAll = () => {
    adminNotifications.forEach((notification) => markNotificationAsRead(notification.id));
  };

  const openRelated = (relatedType?: string, relatedId?: string) => {
    if (relatedType === 'study' && relatedId) navigate(`/admin/review/${relatedId}`);
    else if (relatedType === 'interest' && relatedId) navigate(`/admin/interests/${relatedId}`);
    else if (relatedType === 'meeting') navigate('/admin/meetings');
    else if (relatedType === 'license' && relatedId) navigate(`/admin/licensing/${relatedId}`);
    else if (relatedType === 'license') navigate('/admin/licensing');
    else navigate('/admin/review-queue');
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Admin Notifications</h1>
          <p className="text-sm text-neutral-600">Review workflow events that need NRDC attention.</p>
        </div>
        <WireframeButton label="Mark All as Read" variant="ghost" onClick={markAll} />
      </div>

      <div className="space-y-3">
        {adminNotifications.length === 0 ? (
          <WireframeCard>
            <div className="text-center py-8">
              <Bell size={40} className="mx-auto text-neutral-400 mb-3" />
              <div className="text-sm text-neutral-700">No admin notifications yet.</div>
            </div>
          </WireframeCard>
        ) : (
          adminNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-2 p-4 flex gap-4 ${notification.read ? 'border-neutral-300 bg-neutral-50 opacity-75' : 'border-neutral-400 bg-white'}`}
            >
              <div className={`w-2 flex-shrink-0 ${notification.read ? 'bg-transparent' : 'bg-neutral-800'}`} />
              <div className="w-10 h-10 bg-neutral-200 rounded flex items-center justify-center flex-shrink-0">
                <CheckSquare size={20} className="text-neutral-600" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-neutral-800">{notification.title}</div>
                  <div className="text-xs text-neutral-500">{new Date(notification.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-sm text-neutral-600 mb-3">{notification.message}</div>
                <div className="flex gap-2">
                  <WireframeButton
                    label="Open Workflow"
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      markNotificationAsRead(notification.id);
                      openRelated(notification.relatedType, notification.relatedId);
                    }}
                  />
                  {!notification.read && (
                    <WireframeButton label="Mark Read" variant="ghost" size="sm" onClick={() => markNotificationAsRead(notification.id)} />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
