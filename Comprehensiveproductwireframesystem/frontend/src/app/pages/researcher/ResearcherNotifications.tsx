import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useAppData } from '@/contexts/AppDataContext';
import { WireframeButton } from '../../components/WireframeButton';
import { Bell, Calendar, FileText, MessageSquare } from 'lucide-react';

const iconForType = (type: string) => {
  if (type.includes('meeting')) return Calendar;
  if (type.includes('license') || type.includes('study')) return FileText;
  if (type.includes('interest')) return Bell;
  return MessageSquare;
};

export function ResearcherNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUserNotifications, markNotificationAsRead } = useAppData();
  const notifications = user
    ? getUserNotifications(user.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const markAllAsRead = () => notifications.forEach((notification) => markNotificationAsRead(notification.id));

  const openNotification = (notificationId: string, relatedId?: string, relatedType?: string) => {
    markNotificationAsRead(notificationId);
    if (relatedType === 'license') navigate('/researcher/license-requests');
    else if (relatedType === 'study' && relatedId) navigate(`/researcher/studies/${relatedId}`);
    else navigate('/researcher/studies');
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl text-neutral-800 mb-2">Notifications</h1>
          <p className="text-sm text-neutral-600">Stay updated on your research activities</p>
        </div>
        <WireframeButton label="Mark All as Read" variant="ghost" onClick={markAllAsRead} />
      </div>

      <div className="mb-6 border-b-2 border-neutral-400">
        <div className="flex gap-6">
          <button className="px-4 py-3 border-b-2 border-neutral-800 text-sm text-neutral-800">All ({notifications.length})</button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800">Unread ({unreadCount})</button>
          <button className="px-4 py-3 text-sm text-neutral-600 hover:text-neutral-800">Workflow</button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="border-2 border-neutral-400 bg-white p-12 text-center">
            <Bell size={48} className="text-neutral-400 mx-auto mb-4" />
            <div className="text-lg text-neutral-800 mb-2">No Notifications</div>
            <div className="text-sm text-neutral-600">Workflow updates will appear here after submissions, interests, meetings, and licensing actions.</div>
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = iconForType(notification.type);
            return (
              <div
                key={notification.id}
                className={`border-2 p-4 flex gap-4 ${notification.read ? 'border-neutral-300 bg-neutral-50 opacity-75' : 'border-neutral-400 bg-white'}`}
              >
                <div className={`w-2 flex-shrink-0 ${notification.read ? 'bg-transparent' : 'bg-neutral-800'}`} />
                <div className="w-10 h-10 bg-neutral-200 rounded flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-neutral-600" />
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
                      onClick={() => openNotification(notification.id, notification.relatedId, notification.relatedType)}
                    />
                    {!notification.read && (
                      <WireframeButton label="Mark Read" variant="ghost" size="sm" onClick={() => markNotificationAsRead(notification.id)} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
