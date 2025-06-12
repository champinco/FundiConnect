
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
  limit,
  updateDoc
} from 'firebase/firestore';
import { clientDb } from '@/lib/firebase'; // Use clientDb for client-side operations
import type { Chat, ChatMessage, ChatParticipant } from '@/models/chat';
import { getUserProfileFromFirestore } from '@/services/userService'; 

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
 * Gets or creates a chat session between two users using Client SDK.
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
  const chatRef = doc(clientDb, 'chats', chatId); // Use clientDb
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    // Fetching user profiles might use adminDb if called server-side,
    // but here it's part of a client-initiated flow.
    // For consistency within this client-centric service, ensure userService can handle clientDb if needed
    // or accept that adminDb might be used for profile lookups even from here.
    // Current userService.getUserProfileFromFirestore uses adminDb.
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

    const newChatData: Omit<Chat, 'id' | 'lastMessage' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any, lastMessage: null } = {
      participantUids: [currentUserUid, otherUserUid],
      participants: {
        [currentUserUid]: currentUserParticipant,
        [otherUserUid]: otherUserParticipant,
      },
      lastMessage: null, 
      createdAt: serverTimestamp(), // client-side serverTimestamp
      updatedAt: serverTimestamp(), // client-side serverTimestamp
    };
    await setDoc(chatRef, newChatData);
  }
  return chatId;
}

/**
 * Sends a message in a chat using Client SDK.
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

  const chatRef = doc(clientDb, 'chats', chatId); // Use clientDb
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

  const newMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
    chatId,
    senderUid,
    receiverUid,
    text,
    imageUrl,
    isRead: false, 
    timestamp: serverTimestamp(), // client-side serverTimestamp
  };

  const batch = writeBatch(clientDb); // Use clientDb
  
  const messageDocRef = doc(messagesRef); 
  batch.set(messageDocRef, newMessageData);

  let lastMessageText = text;
  if (imageUrl && !text) {
    lastMessageText = "Sent an image";
  } else if (imageUrl && text) {
    lastMessageText = text; 
  }

  batch.update(chatRef, {
    lastMessage: {
      text: lastMessageText,
      senderUid,
      timestamp: serverTimestamp(), // client-side serverTimestamp
      isReadBy: { [senderUid]: true } 
    },
    updatedAt: serverTimestamp(), // client-side serverTimestamp
    [`participants.${senderUid}.displayName`]: chatData.participants[senderUid]?.displayName || senderUid,
    [`participants.${receiverUid}.displayName`]: chatData.participants[receiverUid]?.displayName || receiverUid,
  });

  await batch.commit();
}

/**
 * Subscribes to a user's chat sessions using Client SDK.
 * @param userUid The UID of the user.
 * @param callback Function to call with the array of chats.
 * @returns An unsubscribe function.
 */
export function subscribeToUserChats(userUid: string, callback: (chats: Chat[]) => void): () => void {
  const q = query(
    collection(clientDb, 'chats'), // Use clientDb
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
  });
}

/**
 * Subscribes to messages in a specific chat using Client SDK.
 * @param chatId The ID of the chat.
 * @param callback Function to call with the array of messages.
 * @returns An unsubscribe function.
 */
export function subscribeToChatMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = collection(clientDb, 'chats', chatId, 'messages'); // Use clientDb
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50)); 

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
  });
}


/**
 * Marks messages in a chat as read by a specific user using Client SDK.
 * @param chatId The ID of the chat.
 * @param readerUid The UID of the user who has read the messages.
 */
export async function markMessagesAsRead(chatId: string, readerUid: string): Promise<void> {
  const chatRef = doc(clientDb, 'chats', chatId); // Use clientDb
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    const chatData = chatSnap.data() as Chat;
    if (chatData.lastMessage && chatData.lastMessage.senderUid !== readerUid) {
      const updateData: any = {
        [`lastMessage.isReadBy.${readerUid}`]: true,
        updatedAt: serverTimestamp() // client-side serverTimestamp
      };
      const otherUid = chatData.participantUids.find(uid => uid !== readerUid);
      if (otherUid && (!chatData.participants[otherUid] || !chatData.participants[otherUid].displayName)) {
        const otherUserProfile = await getUserProfileFromFirestore(otherUid);
        if (otherUserProfile && otherUserProfile.fullName) {
          updateData[`participants.${otherUid}.displayName`] = otherUserProfile.fullName;
          if (otherUserProfile.photoURL) {
            updateData[`participants.${otherUid}.photoURL`] = otherUserProfile.photoURL;
          }
        }
      }
      try {
        await updateDoc(chatRef, updateData);
      } catch (error) {
        console.error(`Error marking messages as read for chat ${chatId} by ${readerUid}:`, error);
      }
    }
  }
}

export function setupChatReadMarker(chatId: string, currentUserUid: string | null | undefined): void {
  if (chatId && currentUserUid) {
    const chatRef = doc(clientDb, 'chats', chatId); // Use clientDb
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data() as Chat;
        if (chatData.lastMessage && 
            chatData.lastMessage.senderUid !== currentUserUid && 
            !chatData.lastMessage.isReadBy?.[currentUserUid]) {
          markMessagesAsRead(chatId, currentUserUid);
        }
      }
    });
    // This unsubscribe should ideally be managed by the calling component's lifecycle.
  }
}
