
"use client";

import Link from 'next/link';
import { ClientNotification, type NotificationType } from '@/models/notification';
import { formatDynamicDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { BookOpen, Briefcase, CheckCircle, MessageSquare, Star, XCircle, Info, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: ClientNotification;
  onMarkAsRead: (notificationId: string) => void;
}

const getIconForNotificationType = (type: NotificationType): React.ReactElement => {
  switch (type) {
    case 'new_booking_request':
      return <Briefcase className="h-4 w-4 text-blue-500" />;
    case 'booking_status_changed':
      return <CheckCircle className="h-4 w-4 text-green-500" />; // Or XCircle for rejected
    case 'new_message':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'new_quote_received':
      return <Mail className="h-4 w-4 text-orange-500" />;
    case 'quote_status_changed':
      return <BookOpen className="h-4 w-4 text-teal-500" />;
    case 'new_review':
      return <Star className="h-4 w-4 text-yellow-500" />;
    case 'job_status_changed':
      return <Info className="h-4 w-4 text-gray-500" />;
    default:
      return <Info className="h-4 w-4 text-gray-500" />;
  }
};

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const content = (
    <div className="flex items-start space-x-3">
      <div className="mt-1">
        {getIconForNotificationType(notification.type)}
      </div>
      <div className="flex-1">
        <p className={cn("text-sm", !notification.isRead && "font-semibold")}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDynamicDate(notification.createdAt, true)}
        </p>
      </div>
      {!notification.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={(e) => {
            e.preventDefault(); // Prevent link navigation if wrapped in Link
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
        >
          Mark Read
        </Button>
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} className="block hover:bg-muted/50 p-3 rounded-md -m-3">
        {content}
      </Link>
    );
  }

  return (
    <div className="p-3">
      {content}
    </div>
  );
}
