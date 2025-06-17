
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Inbox, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ClientNotification } from '@/models/notification';
import { 
  fetchNotificationsAction, 
  markNotificationAsReadClientAction, 
  markAllNotificationsAsReadClientAction 
} from '@/app/actions/notification_actions';
import NotificationItem from './notification-item';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationDropdownProps {
  userId: string | null;
  initialUnreadCount: number;
  onUnreadCountChange: (count: number) => void;
  onClose: () => void; // Function to close the dropdown
}

export default function NotificationDropdown({ userId, initialUnreadCount, onUnreadCountChange, onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setNotifications([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedNotifications = await fetchNotificationsAction(userId);
      setNotifications(fetchedNotifications);
      const newUnreadCount = fetchedNotifications.filter(n => !n.isRead).length;
      onUnreadCountChange(newUnreadCount);
    } catch (e: any) {
      setError(e.message || "Failed to load notifications.");
      toast({ title: "Error", description: "Could not load notifications.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast, onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userId) return;
    const result = await markNotificationAsReadClientAction(notificationId, userId);
    if (result.success) {
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      const newUnreadCount = notifications.filter(n => !n.isRead && n.id !== notificationId).length;
      onUnreadCountChange(newUnreadCount);
    } else {
      toast({ title: "Error", description: result.error || "Failed to mark as read.", variant: "destructive" });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userId || notifications.filter(n => !n.isRead).length === 0) return;
    const result = await markAllNotificationsAsReadClientAction(userId);
    if (result.success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      onUnreadCountChange(0);
      toast({ title: "Success", description: `${result.count || 0} notifications marked as read.` });
    } else {
      toast({ title: "Error", description: result.error || "Failed to mark all as read.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-destructive text-sm text-center">{error}</div>;
  }

  return (
    <div className="w-[350px] md:w-[400px]">
      <div className="p-3 border-b flex justify-between items-center">
        <h4 className="font-medium text-lg">Notifications</h4>
        {notifications.filter(n => !n.isRead).length > 0 && (
          <Button variant="link" size="sm" onClick={handleMarkAllAsRead} className="text-xs h-auto p-0">
            <CheckCheck className="mr-1 h-3.5 w-3.5"/> Mark all as read
          </Button>
        )}
      </div>
      <ScrollArea className="max-h-[400px]">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>You have no notifications yet.</p>
          </div>
        ) : (
          <div className="p-1 divide-y divide-border">
            {notifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
