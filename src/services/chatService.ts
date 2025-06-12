
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
import { clientDb } from '@/lib/firebase'; 
import type { Chat, ChatMessage, ChatParticipant } from '@/models/chat';
// Removed: import { getUserProfileFromFirestore } from '@/services/userService'; 
// getUserProfileFromFirestore uses adminDb, which we want to avoid directly in client-facing services for this operation.

export function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export async function getOrCreateChat(currentUserUid: string, otherUserUid: string): Promise<string> {
  if (!currentUserUid || !otherUserUid) {
    throw new Error("Both user UIDs must be provided.");
  }
  if (currentUserUid === otherUserUid) {
    throw new Error("Cannot create a chat with oneself.");
  }

  const chatId = generateChatId(currentUserUid, otherUserUid);
  const chatRef = doc(clientDb, 'chats', chatId); 
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    // Create participants with minimal info initially.
    // DisplayName and photoURL can be populated by sendMessage or fetched separately by client if needed.
    const currentUserParticipant: ChatParticipant = {
      uid: currentUserUid,
      displayName: "User " + currentUserUid.substring(0, 5), // Placeholder display name
    };
    const otherUserParticipant: ChatParticipant = {
      uid: otherUserUid,
      displayName: "User " + otherUserUid.substring(0, 5), // Placeholder display name
    };

    const newChatData: Omit<Chat, 'id' | 'lastMessage' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any, lastMessage: null } = {
      participantUids: [currentUserUid, otherUserUid],
      participants: {
        [currentUserUid]: currentUserParticipant,
        [otherUserUid]: otherUserParticipant,
      },
      lastMessage: null, 
      createdAt: serverTimestamp(), 
      updatedAt: serverTimestamp(), 
    };
    await setDoc(chatRef, newChatData);
  }
  return chatId;
}

export async function sendMessage(
  chatId: string,
  senderUid: string,
  text: string | null,
  imageUrl: string | null = null,
  senderDisplayName?: string, // Optional: pass sender's display name
  senderPhotoURL?: string | null // Optional: pass sender's photo URL
): Promise<void> {
  if (!text && !imageUrl) {
    throw new Error('Message must have text or an image.');
  }

  const chatRef = doc(clientDb, 'chats', chatId); 
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
    timestamp: serverTimestamp(), 
  };

  const batch = writeBatch(clientDb); 
  
  const messageDocRef = doc(messagesRef); 
  batch.set(messageDocRef, newMessageData);

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
      timestamp: serverTimestamp(), 
      isReadBy: { [senderUid]: true } 
    },
    updatedAt: serverTimestamp(),
  };

  // Update participant details if provided or if they are placeholders
  if (senderDisplayName && (!chatData.participants[senderUid]?.displayName || chatData.participants[senderUid]?.displayName.startsWith("User "))) {
    updatePayload[`participants.${senderUid}.displayName`] = senderDisplayName;
  }
  if (senderPhotoURL !== undefined && chatData.participants[senderUid]?.photoURL !== senderPhotoURL) {
     updatePayload[`participants.${senderUid}.photoURL`] = senderPhotoURL;
  }
  // Ensure receiver details are present or updated if they were placeholders
  if (!chatData.participants[receiverUid]?.displayName || chatData.participants[receiverUid]?.displayName.startsWith("User ")) {
      // If receiver details are minimal, we can try to update them here.
      // This could be a place where you fetch other user's profile if necessary,
      // but for now, we'll rely on a subsequent message from them or client-side fetch.
      // For MVP, keeping it simple.
  }


  batch.update(chatRef, updatePayload);
  await batch.commit();
}

export function subscribeToUserChats(userUid: string, callback: (chats: Chat[]) => void): () => void {
  const q = query(
    collection(clientDb, 'chats'), 
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

export function subscribeToChatMessages(chatId: string, callback: (messages: ChatMessage[]) => void): () => void {
  const messagesRef = collection(clientDb, 'chats', chatId, 'messages'); 
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


export async function markMessagesAsRead(chatId: string, readerUid: string): Promise<void> {
  const chatRef = doc(clientDb, 'chats', chatId); 
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    const chatData = chatSnap.data() as Chat;
    if (chatData.lastMessage && chatData.lastMessage.senderUid !== readerUid) {
      const updateData: any = {
        [`lastMessage.isReadBy.${readerUid}`]: true,
        updatedAt: serverTimestamp() 
      };
      // If participant data is minimal, this is a good place to update it IF we have it client-side
      // For now, this function focuses only on read status.
      try {
        await updateDoc(chatRef, updateData);
      } catch (error) {
        console.error(`Error marking messages as read for chat ${chatId} by ${readerUid}:`, error);
      }
    }
  }
}
