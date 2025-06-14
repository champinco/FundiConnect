
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  serverTimestamp, // Client-side serverTimestamp
  Timestamp as ClientTimestamp, // Client-side Timestamp
  updateDoc,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // For client-side operations
import type { Chat, ChatMessage } from '@/models/chat';


// This function is PURE and can be used by both client and server if needed.
// It doesn't interact with Firebase.
export function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// Client-side function: uses client 'db'
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
        createdAt: (data.createdAt as ClientTimestamp)?.toDate(), 
        updatedAt: (data.updatedAt as ClientTimestamp)?.toDate(), 
        lastMessage: data.lastMessage ? {
          ...data.lastMessage,
          timestamp: (data.lastMessage.timestamp as ClientTimestamp)?.toDate(), 
        } : null,
      } as Chat);
    });
    callback(chats);
  }, (error) => {
    console.error("Error subscribing to user chats:", error);
  });
}

// Client-side function: uses client 'db'
export function subscribeToChatMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50)); // Fetch last 50, consider pagination

  return onSnapshot(q, (querySnapshot) => {
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        ...data,
        timestamp: (data.timestamp as ClientTimestamp)?.toDate(), 
      } as ChatMessage);
    });
    callback(messages);
  }, (error) => {
    console.error("Error subscribing to chat messages:", error);
  });
}

// Client-side function: uses client 'db'
export async function markMessagesAsRead(chatId: string, readerUid: string): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  
  try {
    const chatSnap = await getDoc(chatRef); // Client getDoc

    if (chatSnap.exists()) {
      const chatData = chatSnap.data() as Chat;
      // Mark as read if there's a last message, it's not from the current reader, 
      // and it's not already marked as read by this reader.
      if (chatData.lastMessage && 
          chatData.lastMessage.senderUid !== readerUid &&
          !chatData.lastMessage.isReadBy?.[readerUid]) {
        
        const updateData: any = {
          [`lastMessage.isReadBy.${readerUid}`]: true,
          // We might not need to update 'updatedAt' here just for a read receipt,
          // unless it's critical for ordering/notifications.
          // updatedAt: serverTimestamp() 
        };
        await updateDoc(chatRef, updateData); // Client updateDoc
      }
    }
  } catch (error) {
      console.error(`Error marking messages as read for chat ${chatId} by ${readerUid}:`, error);
      // Optionally re-throw or handle if critical for UI
  }
}
