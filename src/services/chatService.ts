
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Chat, ChatMessage, ChatParticipant } from '@/models/chat';
import { getUserProfileFromFirestore } from '@/services/userService'; // To get display names

/**
 * Generates a consistent chat ID for two user UIDs.
 * @param uid1 First user's UID.
 * @param uid2 Second user's UID.
 * @returns A sorted, combined string ID.
 */
export function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Gets or creates a chat session between two users.
 * @param currentUserUid The UID of the current user.
 * @param otherUserUid The UID of the other participant.
 * @returns The ID of the chat session.
 */
export async function getOrCreateChat(currentUserUid: string, otherUserUid: string): Promise<string> {
  if (!currentUserUid || !otherUserUid) {
    throw new Error("Both user UIDs must be provided.");
  }
  if (currentUserUid === otherUserUid) {
    throw new Error("Cannot create a chat with oneself.");
  }

  const chatId = generateChatId(currentUserUid, otherUserUid);
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    // Fetch profile information for participants
    const [currentUserProfile, otherUserProfile] = await Promise.all([
      getUserProfileFromFirestore(currentUserUid),
      getUserProfileFromFirestore(otherUserUid)
    ]);

    const currentUserParticipant: ChatParticipant = {
      uid: currentUserUid,
      displayName: currentUserProfile?.fullName || currentUserUid,
      photoURL: currentUserProfile?.photoURL || null,
    };
    const otherUserParticipant: ChatParticipant = {
      uid: otherUserUid,
      displayName: otherUserProfile?.fullName || otherUserUid,
      photoURL: otherUserProfile?.photoURL || null,
    };

    const newChatData: Omit<Chat, 'id' | 'lastMessage' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
      participantUids: [currentUserUid, otherUserUid],
      participants: {
        [currentUserUid]: currentUserParticipant,
        [otherUserUid]: otherUserParticipant,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(chatRef, newChatData);
  }
  return chatId;
}

/**
 * Sends a message in a chat.
 * @param chatId The ID of the chat.
 * @param senderUid The UID of the message sender.
 * @param text The message text content.
 * @param imageUrl Optional URL for an image message.
 */
export async function sendMessage(
  chatId: string,
  senderUid: string,
  text: string | null,
  imageUrl: string | null = null
): Promise<void> {
  if (!text && !imageUrl) {
    throw new Error('Message must have text or an image.');
  }

  const chatRef = doc(db, 'chats', chatId);
  const messagesRef = collection(chatRef, 'messages');
  
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    throw new Error("Chat session not found.");
  }
  const chatData = chatSnap.data() as Chat;
  const receiverUid = chatData.participantUids.find(uid => uid !== senderUid);
  if (!receiverUid) {
    throw new Error("Could not determine receiver UID.");
  }

  const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
    chatId,
    senderUid,
    receiverUid,
    text,
    imageUrl,
    isRead: false,
    timestamp: serverTimestamp(),
  };

  const batch = writeBatch(db);
  
  // Use .add() on a collection reference to get an auto-generated ID
  const messageDocRef = doc(messagesRef); // Creates a reference with an auto-ID
  batch.set(messageDocRef, newMessage); // Use set with the new reference

  batch.update(chatRef, {
    lastMessage: {
      text: text || (imageUrl ? 'Image' : ''),
      senderUid,
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Subscribes to a user's chat sessions.
 * Client-side usage due to onSnapshot.
 * @param userUid The UID of the user.
 * @param callback Function to call with the array of chats.
 * @returns An unsubscribe function.
 */
export function subscribeToUserChats(userUid: string, callback: (chats: Chat[]) => void): () => void {
  const q = query(
    collection(db, 'chats'),
    where('participantUids', 'array-contains', userUid),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const chats: Chat[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      chats.push({
        id: docSnap.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        lastMessage: data.lastMessage ? {
          ...data.lastMessage,
          timestamp: (data.lastMessage.timestamp as Timestamp)?.toDate(),
        } : null,
      } as Chat);
    });
    callback(chats);
  }, (error) => {
    console.error("Error subscribing to user chats:", error);
    // Handle error appropriately in the UI
  });
}

/**
 * Subscribes to messages in a specific chat.
 * Client-side usage due to onSnapshot.
 * @param chatId The ID of the chat.
 * @param callback Function to call with the array of messages.
 * @returns An unsubscribe function.
 */
export function subscribeToChatMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50)); // Get last 50, consider pagination later

  return onSnapshot(q, (querySnapshot) => {
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        ...data,
        timestamp: (data.timestamp as Timestamp)?.toDate(),
      } as ChatMessage);
    });
    callback(messages);
  }, (error) => {
    console.error("Error subscribing to chat messages:", error);
    // Handle error appropriately in the UI
  });
}

// TODO: Add function to mark messages as read
// export async function markMessagesAsRead(chatId: string, readerUid: string) { ... }
