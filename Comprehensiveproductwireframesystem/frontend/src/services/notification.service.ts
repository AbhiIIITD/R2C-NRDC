import { Notification, NotificationType } from '@/types/index';

/**
 * Notification Service
 * Handles notifications for all users
 */

// ============================================================================
// Create Notification
// ============================================================================

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  relatedId?: string,
  relatedType?: string
): Promise<Notification> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In future: POST /api/notifications

  const notification: Notification = {
    id: `notif_${Date.now()}`,
    userId,
    type,
    title,
    message,
    relatedId,
    relatedType,
    read: false,
    createdAt: new Date(),
  };

  // Store in localStorage
  const notifications = JSON.parse(
    localStorage.getItem('app_notifications') || '[]'
  );
  notifications.push(notification);
  localStorage.setItem('app_notifications', JSON.stringify(notifications));

  return notification;
}

// ============================================================================
// Mark as Read
// ============================================================================

export async function markAsRead(notificationId: string): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In future: PATCH /api/notifications/:id/read

  const notifications = JSON.parse(
    localStorage.getItem('app_notifications') || '[]'
  );
  const index = notifications.findIndex(
    (n: Notification) => n.id === notificationId
  );
  if (index !== -1) {
    notifications[index].read = true;
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }
}

// ============================================================================
// Get User Notifications
// ============================================================================

export async function getUserNotifications(
  userId: string,
  limit?: number
): Promise<Notification[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In future: GET /api/notifications?userId=:id

  const notifications = JSON.parse(
    localStorage.getItem('app_notifications') || '[]'
  );
  let userNotifications = notifications.filter(
    (n: Notification) => n.userId === userId
  );

  // Sort by date descending
  userNotifications.sort(
    (a: Notification, b: Notification) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (limit) {
    userNotifications = userNotifications.slice(0, limit);
  }

  return userNotifications;
}

// ============================================================================
// Get Unread Count
// ============================================================================

export async function getUnreadCount(userId: string): Promise<number> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In future: GET /api/notifications/unread/count?userId=:id

  const notifications = JSON.parse(
    localStorage.getItem('app_notifications') || '[]'
  );
  return notifications.filter(
    (n: Notification) => n.userId === userId && !n.read
  ).length;
}

// ============================================================================
// Delete Notification
// ============================================================================

export async function deleteNotification(notificationId: string): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In future: DELETE /api/notifications/:id

  const notifications = JSON.parse(
    localStorage.getItem('app_notifications') || '[]'
  );
  const index = notifications.findIndex(
    (n: Notification) => n.id === notificationId
  );
  if (index !== -1) {
    notifications.splice(index, 1);
    localStorage.setItem('app_notifications', JSON.stringify(notifications));
  }
}

// ============================================================================
// Mark All as Read
// ============================================================================

export async function markAllAsRead(userId: string): Promise<void> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // In future: POST /api/notifications/read-all?userId=:id

  const notifications = JSON.parse(
    localStorage.getItem('app_notifications') || '[]'
  );
  notifications.forEach((n: Notification) => {
    if (n.userId === userId) {
      n.read = true;
    }
  });
  localStorage.setItem('app_notifications', JSON.stringify(notifications));
}
