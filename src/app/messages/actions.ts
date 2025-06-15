
'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Chat, ChatMessage, ChatParticipant } from '@/models/chat';
import { getUserProfileFromFirestore } from '@/services/userService'; 

// Helper function (can be co-located or imported)
function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// Helper to ensure adminDb is available
function ensureDbInitialized() {
  if (!adminDb || typeof adminDb.collection !== 'function') {
    const errorMsg = "[ChatActions] CRITICAL: Firebase Admin DB not initialized or adminDb.collection is not a function. Aborting action.";
    console.error(errorMsg);
    throw new Error("Server error: Core database service is not available. Please try again later.");
  }
}

interface GetOrCreateChatResult {
  chatId: string | null;
  error?: string;
  isNew?: boolean;
}

export async function getOrCreateChatAction(currentUserUid: string, otherUserUid: string): Promise<GetOrCreateChatResult> {
  ensureDbInitialized();
  
  if (!currentUserUid || !otherUserUid) {
    console.error("[getOrCreateChatAction] User IDs are required to create or get a chat.");
    return { chatId: null, error: "User IDs are required to create or get a chat." };
  }
  if (currentUserUid === otherUserUid) {
    console.error("[getOrCreateChatAction] Cannot create a chat with oneself.");
    return { chatId: null, error: "Cannot create a chat with oneself." };
  }

  const chatId = generateChatId(currentUserUid, otherUserUid);
  const chatRef = adminDb.collection('chats').doc(chatId);

  try {
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
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
    console.error(`[getOrCreateChatAction] Error for chatId ${chatId}. CurrentUserUID: ${currentUserUid}, OtherUserUID: ${otherUserUid}. Error Details:`, error.message, error.stack);
    return { chatId: null, error: error.message || "Failed to create or get chat session due to an unexpected server error." };
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
  senderDisplayName?: string, 
  senderPhotoURL?: string | null 
): Promise<SendMessageResult> {
  ensureDbInitialized();
  
  if (!chatId || !senderUid) {
    console.error("[sendMessageAction] Chat ID and Sender ID are required.");
    return { success: false, error: "Chat ID and Sender ID are required." };
  }
  if (!text && !imageUrl) {
    console.error("[sendMessageAction] Message must have text or an image.");
    return { success: false, error: 'Message must have text or an image.' };
  }

  const chatRef = adminDb.collection('chats').doc(chatId);
  const messagesCollectionRef = chatRef.collection('messages');

  try {
    const chatSnap = await chatRef.get();
    if (!chatSnap.exists) {
      console.error(`[sendMessageAction] Chat session not found for chatId: ${chatId}`);
      return { success: false, error: "Chat session not found." };
    }
    const chatData = chatSnap.data() as Chat;
    const receiverUid = chatData.participantUids.find(uid => uid !== senderUid);
    if (!receiverUid) {
      console.error(`[sendMessageAction] Could not determine receiver UID for chat: ${chatId}`);
      return { success: false, error: "Could not determine receiver UID for the chat." };
    }

    const newMessageDocRef = messagesCollectionRef.doc(); 
    const newMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: FieldValue } = {
      chatId,
      senderUid,
      receiverUid, 
      text,
      imageUrl,
      isRead: false, 
      timestamp: FieldValue.serverTimestamp(),
    };

    const batch = adminDb.batch();
    batch.set(newMessageDocRef, newMessageData);

    let lastMessageText = text;
    if (imageUrl && !text) {
      lastMessageText = "Sent an image";
    } else if (imageUrl && text) {
      lastMessageText = text; 
    }

    const updatePayload: any = {
      lastMessage: {
        text: lastMessageText,
        senderUid,
        timestamp: FieldValue.serverTimestamp(),
        isReadBy: { [senderUid]: true } 
      },
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const currentSenderParticipant = chatData.participants[senderUid];
    if (senderDisplayName && (!currentSenderParticipant?.displayName || currentSenderParticipant.displayName.startsWith("User ") || currentSenderParticipant.displayName !== senderDisplayName)) {
        updatePayload[`participants.${senderUid}.displayName`] = senderDisplayName;
    }
    if (senderPhotoURL !== undefined && currentSenderParticipant?.photoURL !== senderPhotoURL) {
        updatePayload[`participants.${senderUid}.photoURL`] = senderPhotoURL;
    }

    batch.update(chatRef, updatePayload);
    await batch.commit();

    return { success: true, messageId: newMessageDocRef.id };

  } catch (error: any) {
    console.error(`[sendMessageAction] Error sending message to chatId ${chatId}. SenderUID: ${senderUid}. Error Details:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to send message due to an unexpected server error." };
  }
}
