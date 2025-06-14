
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
  serverTimestamp, // Client-side serverTimestamp
  Timestamp as ClientTimestamp, // Client-side Timestamp
  writeBatch,
  arrayUnion,
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // For client-side operations
import { adminDb } from '@/lib/firebaseAdmin'; // For server-side operations
import { FieldValue as AdminFieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore'; // For Admin SDK
import type { Chat, ChatMessage, ChatParticipant } from '@/models/chat';

export function generateChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// This function is called by server actions, so it should use adminDb
export async function getOrCreateChat(currentUserUid: string, otherUserUid: string): Promise<string> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Chat creation/retrieval failed.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  if (!currentUserUid || !otherUserUid) {
    throw new Error("Both user UIDs must be provided.");
  }
  if (currentUserUid === otherUserUid) {
    throw new Error("Cannot create a chat with oneself.");
  }

  const chatId = generateChatId(currentUserUid, otherUserUid);
  const chatRef = adminDb.collection('chats').doc(chatId);
  const chatSnap = await chatRef.get();

  if (!chatSnap.exists) {
    const currentUserParticipant: ChatParticipant = {
      uid: currentUserUid,
      displayName: "User " + currentUserUid.substring(0, 5),
    };
    const otherUserParticipant: ChatParticipant = {
      uid: otherUserUid,
      displayName: "User " + otherUserUid.substring(0, 5),
    };

    const newChatData: Omit<Chat, 'id' | 'lastMessage' | 'createdAt' | 'updatedAt'> & { createdAt: AdminFieldValue, updatedAt: AdminFieldValue, lastMessage: null } = {
      participantUids: [currentUserUid, otherUserUid],
      participants: {
        [currentUserUid]: currentUserParticipant,
        [otherUserUid]: otherUserParticipant,
      },
      lastMessage: null,
      createdAt: AdminFieldValue.serverTimestamp(),
      updatedAt: AdminFieldValue.serverTimestamp(),
    };
    await chatRef.set(newChatData);
  }
  return chatId;
}

// This function is called by server actions, so it should use adminDb
export async function sendMessage(
  chatId: string,
  senderUid: string,
  text: string | null,
  imageUrl: string | null = null,
  senderDisplayName?: string,
  senderPhotoURL?: string | null
): Promise<void> {
  if (!adminDb) {
    console.error("Admin DB not initialized. Cannot send message.");
    throw new Error("Server error: Admin DB not initialized.");
  }
  if (!text && !imageUrl) {
    throw new Error('Message must have text or an image.');
  }

  const chatRef = adminDb.collection('chats').doc(chatId);
  const messagesCollectionRef = chatRef.collection('messages');

  const chatSnap = await chatRef.get();
  if (!chatSnap.exists) {
    throw new Error("Chat session not found.");
  }
  const chatData = chatSnap.data() as Chat;
  const receiverUid = chatData.participantUids.find(uid => uid !== senderUid);
  if (!receiverUid) {
    throw new Error("Could not determine receiver UID.");
  }

  const newMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: AdminFieldValue } = {
    chatId,
    senderUid,
    receiverUid,
    text,
    imageUrl,
    isRead: false,
    timestamp: AdminFieldValue.serverTimestamp(),
  };

  const batch = adminDb.batch();
  const messageDocRef = messagesCollectionRef.doc(); // Auto-generate ID for subcollection message
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
      timestamp: AdminFieldValue.serverTimestamp(),
      isReadBy: { [senderUid]: true }
    },
    updatedAt: AdminFieldValue.serverTimestamp(),
  };

  if (senderDisplayName && (!chatData.participants[senderUid]?.displayName || chatData.participants[senderUid]?.displayName.startsWith("User "))) {
    updatePayload[`participants.${senderUid}.displayName`] = senderDisplayName;
  }
  if (senderPhotoURL !== undefined && chatData.participants[senderUid]?.photoURL !== senderPhotoURL) {
     updatePayload[`participants.${senderUid}.photoURL`] = senderPhotoURL;
  }

  batch.update(chatRef, updatePayload);
  await batch.commit();
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
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

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
  const chatSnap = await getDoc(chatRef); // Client getDoc

  if (chatSnap.exists()) {
    const chatData = chatSnap.data() as Chat;
    if (chatData.lastMessage && chatData.lastMessage.senderUid !== readerUid) {
      const updateData: any = {
        [`lastMessage.isReadBy.${readerUid}`]: true,
        updatedAt: serverTimestamp() // Client serverTimestamp
      };
      try {
        await updateDoc(chatRef, updateData); // Client updateDoc
      } catch (error) {
        console.error(`Error marking messages as read for chat ${chatId} by ${readerUid}:`, error);
      }
    }
  }
}
