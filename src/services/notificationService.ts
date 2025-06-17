
/**
 * @fileOverview Service functions for creating and managing notifications in Firestore.
 */
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore'; // Ensure Timestamp is imported for type annotation
import type { Notification, NotificationType } from '@/models/notification';

export interface CreateNotificationData {
  userId: string; // The UID of the user who should receive this notification
  type: NotificationType;
  message: string;
  relatedEntityId?: string | null;
  link?: string | null;
}

/**
 * Creates a new notification document in Firestore using Admin SDK.
 * @param data - The notification data.
 * @returns A promise that resolves with the ID of the newly created notification.
 */
export async function createNotification(data: CreateNotificationData): Promise<string> {
  if (!adminDb) {
    console.error("[NotificationService] Admin DB not initialized. Notification creation failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  try {
    const notificationsCollectionRef = adminDb.collection('notifications');
    const newNotificationRef = notificationsCollectionRef.doc(); // Auto-generate ID
    const now = FieldValue.serverTimestamp();

    const notificationPayload: Omit<Notification, 'id' | 'createdAt' | 'isRead'> & { createdAt: FieldValue, isRead: boolean, updatedAt: FieldValue } = {
      userId: data.userId,
      type: data.type,
      message: data.message,
      relatedEntityId: data.relatedEntityId || null,
      link: data.link || null,
      isRead: false,
      createdAt: now,
      updatedAt: now, // Add updatedAt on creation
    };

    await newNotificationRef.set(notificationPayload);
    console.log(`[NotificationService] Successfully created notification ${newNotificationRef.id} for user ${data.userId} of type ${data.type}.`);
    return newNotificationRef.id;
  } catch (error: any) {
    console.error(`[NotificationService] Error creating notification. Data: ${JSON.stringify(data)}. Error:`, error.message, error.stack);
    throw new Error('Could not create notification.');
  }
}

/**
 * Marks a notification as read.
 * @param notificationId - The ID of the notification to mark as read.
 * @returns A promise that resolves when the operation is complete.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!adminDb) {
    console.error("[NotificationService] Admin DB not initialized. Marking notification as read failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const notificationRef = adminDb.collection('notifications').doc(notificationId);
  try {
    await notificationRef.update({ isRead: true, updatedAt: FieldValue.serverTimestamp() as Timestamp }); // Added updatedAt
    console.log(`[NotificationService] Notification ${notificationId} marked as read.`);
  } catch (error: any) {
    console.error(`[NotificationService] Error marking notification ${notificationId} as read. Error:`, error.message, error.stack);
    throw new Error('Could not mark notification as read.');
  }
}

/**
 * Marks all unread notifications for a user as read.
 * @param userId - The UID of the user.
 * @returns A promise that resolves when the operation is complete.
 */
export async function markAllNotificationsAsReadForUser(userId: string): Promise<void> {
  if (!adminDb) {
    console.error("[NotificationService] Admin DB not initialized. Marking all notifications as read failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  const notificationsRef = adminDb.collection('notifications');
  const q = notificationsRef.where('userId', '==', userId).where('isRead', '==', false);
  try {
    const snapshot = await q.get();
    if (snapshot.empty) {
      console.log(`[NotificationService] No unread notifications to mark for user ${userId}.`);
      return;
    }
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isRead: true, updatedAt: FieldValue.serverTimestamp() as Timestamp }); // Added updatedAt
    });
    await batch.commit();
    console.log(`[NotificationService] Marked ${snapshot.size} notifications as read for user ${userId}.`);
  } catch (error: any) {
    console.error(`[NotificationService] Error marking all notifications as read for user ${userId}. Error:`, error.message, error.stack);
    throw new Error('Could not mark all notifications as read.');
  }
}
