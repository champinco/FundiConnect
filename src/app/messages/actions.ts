
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Chat, ChatMessage, ChatParticipant } from '@/models/chat';
import { getUserProfileFromFirestore } // Assuming this uses adminDb if called server-side
from '@/services/userService'; 

// Helper to generate chat ID, can be co-located or imported if it's pure
function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

interface GetOrCreateChatResult {
  chatId: string;
  error?: string;
  isNew?: boolean;
}

export async function getOrCreateChatAction(currentUserUid: string, otherUserUid: string): Promise<GetOrCreateChatResult> {
  if (!adminDb) {
    console.error("[getOrCreateChatAction] Admin DB not initialized.");
    return { chatId: '', error: "Server error: Could not connect to the database." };
  }
  if (!currentUserUid || !otherUserUid) {
    return { chatId: '', error: "User IDs are required to create or get a chat." };
  }
  if (currentUserUid === otherUserUid) {
    return { chatId: '', error: "Cannot create a chat with oneself." };
  }

  const chatId = generateChatId(currentUserUid, otherUserUid);
  const chatRef = adminDb.collection('chats').doc(chatId);

  try {
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      // Fetch minimal participant details (ideally, these would be passed or more robustly fetched)
      const currentUserProfile = await getUserProfileFromFirestore(currentUserUid);
      const otherUserProfile = await getUserProfileFromFirestore(otherUserUid);

      const currentUserParticipant: ChatParticipant = {
        uid: currentUserUid,
        displayName: currentUserProfile?.fullName || "User " + currentUserUid.substring(0, 5),
        photoURL: currentUserProfile?.photoURL || null,
      };
      const otherUserParticipant: ChatParticipant = {
        uid: otherUserUid,
        displayName: otherUserProfile?.fullName || "User " + otherUserUid.substring(0, 5),
        photoURL: otherUserProfile?.photoURL || null,
      };

      const newChatData: Omit<Chat, 'id' | 'lastMessage' | 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue, lastMessage: null } = {
        participantUids: [currentUserUid, otherUserUid],
        participants: {
          [currentUserUid]: currentUserParticipant,
          [otherUserUid]: otherUserParticipant,
        },
        lastMessage: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await chatRef.set(newChatData);
      return { chatId, isNew: true };
    }
    return { chatId, isNew: false };
  } catch (error: any) {
    console.error(`[getOrCreateChatAction] Error for chatId ${chatId}:`, error);
    return { chatId: '', error: error.message || "Failed to create or get chat session." };
  }
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendMessageAction(
  chatId: string,
  senderUid: string,
  text: string | null,
  imageUrl: string | null = null,
  senderDisplayName?: string, // Optional, but good for updating participant details
  senderPhotoURL?: string | null // Optional
): Promise<SendMessageResult> {
  if (!adminDb) {
    console.error("[sendMessageAction] Admin DB not initialized.");
    return { success: false, error: "Server error: Could not send message." };
  }
  if (!chatId || !senderUid) {
    return { success: false, error: "Chat ID and Sender ID are required." };
  }
  if (!text && !imageUrl) {
    return { success: false, error: 'Message must have text or an image.' };
  }

  const chatRef = adminDb.collection('chats').doc(chatId);
  const messagesCollectionRef = chatRef.collection('messages');

  try {
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      return { success: false, error: "Chat session not found." };
    }
    const chatData = chatSnap.data() as Chat;
    const receiverUid = chatData.participantUids.find(uid => uid !== senderUid);
    if (!receiverUid) {
      return { success: false, error: "Could not determine receiver UID for the chat." };
    }

    const newMessageDocRef = messagesCollectionRef.doc(); // Auto-generate ID for the message
    const newMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: FieldValue } = {
      chatId,
      senderUid,
      receiverUid, // For context, derived from chat participants
      text,
      imageUrl,
      isRead: false, // Default to false, client can update this locally or via another mechanism
      timestamp: FieldValue.serverTimestamp(),
    };

    const batch = adminDb.batch();
    batch.set(newMessageDocRef, newMessageData);

    let lastMessageText = text;
    if (imageUrl && !text) {
      lastMessageText = "Sent an image";
    } else if (imageUrl && text) {
      lastMessageText = text; // Prefer text if both are present for snippet
    }

    // Prepare update payload for the chat document
    const updatePayload: any = {
      lastMessage: {
        text: lastMessageText,
        senderUid,
        timestamp: FieldValue.serverTimestamp(),
        // isReadBy will be handled by client subscriptions or specific read receipt actions
        isReadBy: { [senderUid]: true } // Mark as read by sender
      },
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // Update participant details if provided and different or missing
    const currentSenderParticipant = chatData.participants[senderUid];
    let participantUpdated = false;
    if (senderDisplayName && (!currentSenderParticipant?.displayName || currentSenderParticipant.displayName.startsWith("User ") || currentSenderParticipant.displayName !== senderDisplayName)) {
        updatePayload[`participants.${senderUid}.displayName`] = senderDisplayName;
        participantUpdated = true;
    }
    if (senderPhotoURL !== undefined && currentSenderParticipant?.photoURL !== senderPhotoURL) {
        updatePayload[`participants.${senderUid}.photoURL`] = senderPhotoURL;
        participantUpdated = true;
    }

    batch.update(chatRef, updatePayload);
    await batch.commit();

    return { success: true, messageId: newMessageDocRef.id };

  } catch (error: any) {
    console.error(`[sendMessageAction] Error sending message to chatId ${chatId}:`, error);
    return { success: false, error: error.message || "Failed to send message." };
  }
}
