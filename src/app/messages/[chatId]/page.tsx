
"use client";

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 
import { subscribeToChatMessages, sendMessage, generateChatId } from '@/services/chatService';
import type { ChatMessage, ChatParticipant, Chat } from '@/models/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Loader2, UserCircle2, MessageSquareText } from 'lucide-react'; // Added MessageSquareText
import Link from 'next/link';
import { format } from 'date-fns';
import ChatMessageSkeleton from '@/components/skeletons/chat-message-skeleton'; // New Import

const ChatPage: NextPage = () => {
  const params = useParams();
  const router = useRouter();
  const chatId = typeof params.chatId === 'string' ? params.chatId : '';
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [isSending, setIsSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<ChatParticipant | null>(null);
  const [chatExists, setChatExists] = useState<boolean | null>(null); // null: unknown, true: exists, false: not found

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadDoneRef = useRef(false); // To prevent setIsLoading(false) too early in subscribeToChatMessages

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsLoading(false); // If no user, stop general loading
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!chatId || !currentUser?.uid) {
      if (currentUser === null && !isLoading) setIsLoading(false); // Known not logged in, stop loading
      return;
    }

    setIsLoading(true);
    initialLoadDoneRef.current = false;
    const chatRef = doc(db, 'chats', chatId);
    
    getDoc(chatRef).then(chatSnap => {
      if (chatSnap.exists()) {
        setChatExists(true);
        const chatData = chatSnap.data() as Chat;
        const otherUid = chatData.participantUids.find(uid => uid !== currentUser.uid);
        if (otherUid && chatData.participants[otherUid]) {
          setOtherParticipant(chatData.participants[otherUid]);
        } else {
          const derivedOtherUid = chatId.split('_').find(id => id !== currentUser.uid) || "Unknown User";
          setOtherParticipant({ uid: derivedOtherUid, displayName: derivedOtherUid });
        }
        
        // Subscribe to messages only if chat exists
        const unsubscribeMessages = subscribeToChatMessages(chatId, (updatedMessages) => {
          setMessages(updatedMessages);
          if (!initialLoadDoneRef.current) {
            setIsLoading(false); // Stop loading after first batch of messages
            initialLoadDoneRef.current = true;
          }
        });
        return () => unsubscribeMessages();

      } else {
        setChatExists(false);
        setIsLoading(false);
      }
    }).catch(error => {
        console.error("Error fetching chat details:", error);
        setChatExists(false);
        setIsLoading(false);
    });

  }, [chatId, currentUser]); 

  useEffect(() => {
    if (messages.length > 0 && !isLoading) { // Only scroll if not loading and messages are present
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser?.uid || !chatId || !chatExists) return;

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
  
  if (isLoading && chatExists === null && currentUser === undefined) { // Initial page load before auth is even checked
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Initializing chat...</p>
      </div>
    );
  }

  if (!currentUser && !isLoading) { // Auth checked, user is not logged in
    return (
      <div className="container mx-auto px-4 py-8 text-center">
         <p>Please log in to view messages.</p>
         <Button asChild className="mt-4">
           <Link href={`/auth/login?redirect=/messages/${chatId}`}>Login</Link>
         </Button>
      </div>
    );
  }
  
  if (chatExists === false && !isLoading) { // Chat confirmed not to exist
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

  // If currentUser exists but chat details (otherParticipant) are still loading
  if (isLoading && currentUser && chatExists === null ) {
     return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Skeleton Header */}
        <header className="flex items-center p-4 border-b bg-background shadow-sm">
            <Button variant="ghost" size="icon" className="mr-2 opacity-50"><ArrowLeft className="h-6 w-6" /></Button>
            <Avatar className="h-10 w-10 mr-3 opacity-50"><AvatarFallback>U</AvatarFallback></Avatar>
            <div className="h-6 w-32 bg-muted rounded-md animate-pulse"></div> {/* Skeleton for name */}
        </header>
        {/* Skeleton Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[...Array(5)].map((_, i) => <ChatMessageSkeleton key={i} isCurrentUser={i % 2 === 0} />)}
        </div>
         {/* Skeleton Input Form */}
        <div className="p-4 border-t bg-background">
            <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" type="button" disabled><Paperclip className="h-5 w-5" /></Button>
            <Input type="text" placeholder="Type your message..." className="flex-1 h-10" disabled />
            <Button type="submit" size="icon" disabled><Send className="h-5 w-5" /></Button>
            </div>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-card"> 
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 ? ( // Still loading initial messages for an existing chat
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => <ChatMessageSkeleton key={i} isCurrentUser={i % 2 === 0} />)}
            </div>
        ) : !isLoading && messages.length === 0 ? ( // Loaded, but no messages
          <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center h-full">
            <MessageSquareText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : ( // Loaded and has messages
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderUid === currentUser?.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-xl shadow ${
                  msg.senderUid === currentUser?.uid
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
                <p className={`text-xs mt-1 ${msg.senderUid === currentUser?.uid ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.timestamp), 'p')}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" type="button" disabled> 
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            type="text"
            value={newMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 h-10"
            disabled={isSending || isLoading || !chatExists}
          />
          <Button type="submit" size="icon" disabled={isSending || !newMessage.trim() || isLoading || !chatExists}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;
