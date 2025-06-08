
"use client";

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Import db
import { doc, getDoc } from 'firebase/firestore'; // Import getDoc
import { subscribeToChatMessages, sendMessage, generateChatId } from '@/services/chatService';
import type { ChatMessage, ChatParticipant, Chat } from '@/models/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Loader2, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const ChatPage: NextPage = () => {
  const params = useParams();
  const router = useRouter();
  const chatId = typeof params.chatId === 'string' ? params.chatId : '';
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<ChatParticipant | null>(null);
  const [chatExists, setChatExists] = useState<boolean | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // router.push('/auth/login?redirect=/messages'); // If auth enabled
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) {
      if (currentUser?.uid === null) setIsLoading(false); // Explicitly stop loading if auth known to be null
      return;
    }

    setIsLoading(true);
    const chatRef = doc(db, 'chats', chatId);
    getDoc(chatRef).then(chatSnap => {
      if (chatSnap.exists()) {
        setChatExists(true);
        const chatData = chatSnap.data() as Chat;
        const otherUid = chatData.participantUids.find(uid => uid !== currentUser.uid);
        if (otherUid && chatData.participants[otherUid]) {
          setOtherParticipant(chatData.participants[otherUid]);
        } else {
           // Fallback if participant detail is missing (should not happen with getOrCreateChat)
          const derivedOtherUid = chatId.split('_').find(id => id !== currentUser.uid) || "Unknown User";
          setOtherParticipant({ uid: derivedOtherUid, displayName: derivedOtherUid });
        }
      } else {
        setChatExists(false);
        setIsLoading(false);
        return;
      }

      const unsubscribeMessages = subscribeToChatMessages(chatId, (updatedMessages) => {
        setMessages(updatedMessages);
        if(isLoading) setIsLoading(false); // Set loading to false after first messages are fetched
      });
      return () => unsubscribeMessages();

    }).catch(error => {
        console.error("Error fetching chat details:", error);
        setChatExists(false);
        setIsLoading(false);
    });

  }, [chatId, currentUser, isLoading]); // Added isLoading to deps to re-evaluate after messages load

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser?.uid || !chatId) return;

    setIsSending(true);
    try {
      await sendMessage(chatId, currentUser.uid, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      // TODO: Show toast error
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && chatExists === null) { // Initial loading before we know if chat exists
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading chat...</p>
      </div>
    );
  }
  
  if (chatExists === false) {
     return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center p-4 text-center">
        <UserCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Chat Not Found</h2>
        <p className="text-muted-foreground mb-6">This conversation does not exist or you may not have access to it.</p>
        <Button asChild variant="outline">
          <Link href="/messages">Go to My Messages</Link>
        </Button>
      </div>
    );
  }


  if (!currentUser) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
         <p>Please log in to view messages.</p>
         <Button asChild className="mt-4">
           <Link href={`/auth/login?redirect=/messages/${chatId}`}>Login</Link>
         </Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-card"> {/* Adjust height to account for header */}
      {/* Chat Header */}
      <header className="flex items-center p-4 border-b bg-background shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => router.push('/messages')} className="mr-2">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Avatar className="h-10 w-10 mr-3">
          <AvatarImage src={otherParticipant?.photoURL || undefined} alt={otherParticipant?.displayName || "User"} data-ai-hint="user avatar" />
          <AvatarFallback>{otherParticipant?.displayName ? otherParticipant.displayName.substring(0,1).toUpperCase() : "U"}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold font-headline">{otherParticipant?.displayName || 'Chat'}</h2>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3">Loading messages...</p>
            </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <MessageSquareText className="h-12 w-12 mx-auto mb-3" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderUid === currentUser.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow ${
                  msg.senderUid === currentUser.uid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border'
                }`}
              >
                {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                {msg.imageUrl && (
                  <div className="mt-2">
                    <img src={msg.imageUrl} alt="Chat image" className="rounded-lg max-w-full h-auto max-h-64 object-contain" data-ai-hint="chat image" />
                  </div>
                )}
                <p className={`text-xs mt-1 ${msg.senderUid === currentUser.uid ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.timestamp), 'p')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" type="button" disabled> {/* Placeholder for file upload */}
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            type="text"
            value={newMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 h-10"
            disabled={isSending}
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;

