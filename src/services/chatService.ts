
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
import { db } from '@/lib/firebase';
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
      lastMessage: null, // Initialize lastMessage as null
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

  const newMessageData: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp: any } = {
    chatId,
    senderUid,
    receiverUid,
    text,
    imageUrl,
    isRead: false, 
    timestamp: serverTimestamp(),
  };

  const batch = writeBatch(db);
  
  const messageDocRef = doc(messagesRef); 
  batch.set(messageDocRef, newMessageData);

  let lastMessageText = text;
  if (imageUrl && !text) {
    lastMessageText = "Sent an image";
  } else if (imageUrl && text) {
    lastMessageText = text; // If there's text with an image, use the text as the preview
  }


  batch.update(chatRef, {
    lastMessage: {
      text: lastMessageText,
      senderUid,
      timestamp: serverTimestamp(),
      isReadBy: { [senderUid]: true } // Mark as read by sender
    },
    updatedAt: serverTimestamp(),
    // Ensure participants field is updated if it wasn't fully populated during getOrCreateChat
    // This part might be redundant if getOrCreateChat always fully populates participants
    [`participants.${senderUid}.displayName`]: chatData.participants[senderUid]?.displayName || senderUid,
    [`participants.${receiverUid}.displayName`]: chatData.participants[receiverUid]?.displayName || receiverUid,

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
 * Marks messages in a chat as read by a specific user.
 * @param chatId The ID of the chat.
 * @param readerUid The UID of the user who has read the messages.
 */
export async function markMessagesAsRead(chatId: string, readerUid: string): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);

  if (chatSnap.exists()) {
    const chatData = chatSnap.data() as Chat;
    if (chatData.lastMessage && chatData.lastMessage.senderUid !== readerUid) {
      // Update the lastMessage.isReadBy field
      const updateData: any = {
        [`lastMessage.isReadBy.${readerUid}`]: true,
        updatedAt: serverTimestamp() // Also update overall chat timestamp
      };
       // If the other participant's display name is missing, try to fetch and update it
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

        // Additionally, you could iterate through unread messages in the subcollection
        // and mark them as read if needed, but updating lastMessage is often sufficient for UI indicators.
        // For a full unread count system, you'd need more complex logic.
      } catch (error) {
        console.error(`Error marking messages as read for chat ${chatId} by ${readerUid}:`, error);
        // Don't throw, as this is often a background-like operation.
      }
    }
  }
}

// Call this when a chat is opened by a user.
export function setupChatReadMarker(chatId: string, currentUserUid: string | null | undefined): void {
  if (chatId && currentUserUid) {
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data() as Chat;
        // If there's a last message and it wasn't sent by the current user,
        // and it's not marked as read by the current user, then mark it as read.
        if (chatData.lastMessage && 
            chatData.lastMessage.senderUid !== currentUserUid && 
            !chatData.lastMessage.isReadBy?.[currentUserUid]) {
          markMessagesAsRead(chatId, currentUserUid);
        }
      }
    });
    // Important: This `unsubscribe` should be called when the component using this setup unmounts,
    // or it will lead to memory leaks and continued Firestore reads.
    // This function is better integrated into the component's useEffect that also subscribes to messages.
    // For now, this is a conceptual placement.
  }
}

