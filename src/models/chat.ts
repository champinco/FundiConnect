
export interface ChatParticipant {
  uid: string;
  displayName: string; // We'll try to populate this, or default to UID
  photoURL?: string | null;
}

export interface Chat {
  id: string; // Composite ID: uid1_uid2 (sorted)
  participantUids: string[];
  participants: {
    [uid: string]: ChatParticipant; // Information about each participant
  };
  lastMessage: {
    text: string;
    senderUid: string;
    timestamp: Date;
    isReadBy?: { [uid: string]: boolean };
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string; // Firestore document ID
  chatId: string;
  senderUid: string;
  receiverUid: string; // For context, though chat implies participants
  text: string | null;
  imageUrl: string | null;
  timestamp: Date;
  isRead: boolean;
}
