
"use server";

import { adminDb } from '@/lib/firebaseAdmin';
import { auth as clientAuth } from '@/lib/firebase'; // Client auth for current user check
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { Notification as AppNotification, ClientNotification } from '@/models/notification'; // Use AppNotification to avoid conflict

// Helper to convert Firestore Timestamps to JS Dates for client consumption
const robustTimestampToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date(); // Should ideally not happen for createdAt
    if (timestamp instanceof Date) return timestamp;
    if (typeof (timestamp as any).toDate === 'function') {
        return (timestamp as import('firebase-admin/firestore').Timestamp).toDate();
    }
    return new Date(timestamp); // Fallback for strings/numbers
};


export async function fetchNotificationsAction(currentUserId: string | null): Promise<ClientNotification[]> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[fetchNotificationsAction] CRITICAL: Firebase Admin DB not initialized.");
    return [];
  }
  if (!currentUserId) {
    console.warn("[fetchNotificationsAction] No current user ID provided. Cannot fetch notifications.");
    return [];
  }

  try {
    const notificationsRef = adminDb.collection('notifications');
    const q = notificationsRef
      .where('userId', '==', currentUserId)
      .orderBy('createdAt', 'desc')
      .limit(20); // Limit to recent notifications

    const snapshot = await q.get();
    const notifications: ClientNotification[] = [];
    snapshot.forEach(doc => {
      const data = doc.data() as AppNotification; // Cast to AppNotification from model
      notifications.push({
        ...data,
        id: doc.id,
        createdAt: robustTimestampToDate(data.createdAt),
      });
    });
    console.log(`[fetchNotificationsAction] Fetched ${notifications.length} notifications for user ${currentUserId}.`);
    return notifications;
  } catch (error: any) {
    console.error(`[fetchNotificationsAction] Error fetching notifications for user ${currentUserId}:`, error.message, error.stack);
    return [];
  }
}


export async function markNotificationAsReadClientAction(notificationId: string, currentUserId: string | null): Promise<{ success: boolean; error?: string }> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[markNotificationAsReadClientAction] CRITICAL: Firebase Admin DB not initialized.");
    return { success: false, error: "Server error: Core database service unavailable." };
  }
  if (!currentUserId) {
    console.warn("[markNotificationAsReadClientAction] No current user ID provided.");
    return { success: false, error: "User not authenticated." };
  }
  if (!notificationId) {
    return { success: false, error: "Notification ID is required." };
  }

  try {
    const notificationRef = adminDb.collection('notifications').doc(notificationId);
    const doc = await notificationRef.get();

    if (!doc.exists) {
      return { success: false, error: "Notification not found." };
    }
    if (doc.data()?.userId !== currentUserId) {
      return { success: false, error: "You are not authorized to update this notification." };
    }

    await notificationRef.update({ isRead: true, updatedAt: FieldValue.serverTimestamp() });
    console.log(`[markNotificationAsReadClientAction] Notification ${notificationId} marked as read for user ${currentUserId}.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[markNotificationAsReadClientAction] Error marking notification ${notificationId} as read:`, error.message, error.stack);
    return { success: false, error: `Failed to mark notification as read: ${error.message}` };
  }
}

export async function markAllNotificationsAsReadClientAction(currentUserId: string | null): Promise<{ success: boolean; error?: string; count?: number }> {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    console.error("[markAllNotificationsAsReadClientAction] CRITICAL: Firebase Admin DB not initialized.");
    return { success: false, error: "Server error: Core database service unavailable." };
  }
   if (!currentUserId) {
    console.warn("[markAllNotificationsAsReadClientAction] No current user ID provided.");
    return { success: false, error: "User not authenticated." };
  }

  try {
    const notificationsRef = adminDb.collection('notifications');
    const q = notificationsRef.where('userId', '==', currentUserId).where('isRead', '==', false);
    const snapshot = await q.get();

    if (snapshot.empty) {
      return { success: true, count: 0, error: "No unread notifications to mark." };
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true, updatedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();
    console.log(`[markAllNotificationsAsReadClientAction] Marked ${snapshot.size} notifications as read for user ${currentUserId}.`);
    return { success: true, count: snapshot.size };
  } catch (error: any) {
    console.error(`[markAllNotificationsAsReadClientAction] Error marking all notifications as read for user ${currentUserId}:`, error.message, error.stack);
    return { success: false, error: `Failed to mark all notifications as read: ${error.message}` };
  }
}

export async function getUnreadNotificationCountAction(currentUserId: string | null): Promise<number> {
  if (!adminDb || typeof adminDb.collection !== 'function' || !currentUserId) {
    return 0;
  }
  try {
    const notificationsRef = adminDb.collection('notifications');
    const q = notificationsRef
      .where('userId', '==', currentUserId)
      .where('isRead', '==', false);
    const snapshot = await q.count().get(); // Use .count() for efficiency
    return snapshot.data().count;
  } catch (error: any) {
    console.error(`[getUnreadNotificationCountAction] Error fetching unread count for user ${currentUserId}:`, error.message);
    return 0;
  }
}
