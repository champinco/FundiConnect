
"use client";

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot as onDocSnapshot } from 'firebase/firestore';
import { subscribeToChatMessages } from '@/services/chatService'; // Client-side subscriptions
import { sendMessageAction } from '@/app/messages/actions'; // Server Action for sending
import type { ChatMessage, ChatParticipant, Chat } from '@/models/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Loader2, UserCircle2, MessageSquareText, XCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import ChatMessageSkeleton from '@/components/skeletons/chat-message-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadFileToStorage } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const ChatPage: NextPage = () => {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const chatId = typeof params.chatId === 'string' ? params.chatId : '';

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherParticipant, setOtherParticipant] = useState<ChatParticipant | null>(null);
  const [chatExists, setChatExists] = useState<boolean | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialLoadDoneRef = useRef(false);

  // Effect for auth state
  useEffect(() => {
    setIsLoading(true); // Assume loading until auth state is resolved
    initialLoadDoneRef.current = false; // Reset on auth change too

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user && chatId) { // If user logs out or is not available
        setIsLoading(false); // Not loading if no user
        setChatExists(null); // Reset chat state
        setMessages([]);
        setOtherParticipant(null);
      }
      // If user *is* defined, the next effect will handle chat loading.
      // If user becomes null (logged out), this effect sets isLoading to false.
      // If user remains undefined (initial check), isLoading remains true.
    });
    return () => unsubscribeAuth();
  }, [chatId]); // Only depends on chatId for the "!user && chatId" case.

  // Effect for chat document and messages, depends on currentUser's UID and chatId
  useEffect(() => {
    // Guard: Do nothing if we don't have a current user's UID or a chatId
    if (!currentUser?.uid || !chatId) {
      if (currentUser === null) { // User is explicitly logged out
        setIsLoading(false);
        setChatExists(false); // No chat if no user
        setMessages([]);
        setOtherParticipant(null);
      }
      // If currentUser is undefined (auth state still resolving), don't do anything here.
      // The auth effect will eventually set currentUser, triggering this effect again.
      return;
    }

    // Start loading sequence for chat data
    setIsLoading(true);
    setChatExists(null); // Reset chatExists before fetching
    initialLoadDoneRef.current = false;

    const chatRef = doc(db, 'chats', chatId);
    let unsubscribeMessages: (() => void) | null = null;

    const unsubscribeChatDoc = onDocSnapshot(chatRef, (chatSnap) => {
      if (chatSnap.exists()) {
        setChatExists(true);
        const chatData = chatSnap.data() as Chat;
        const otherUid = chatData.participantUids.find(uid => uid !== currentUser.uid);

        if (otherUid && chatData.participants[otherUid]) {
          setOtherParticipant(chatData.participants[otherUid]);
        } else {
          const derivedOtherUid = chatId.split('_').find(id => id !== currentUser.uid) || "Unknown User";
          setOtherParticipant({ uid: derivedOtherUid, displayName: "User " + derivedOtherUid.substring(0,5) });
        }

        // Subscribe to messages only if chat exists and we haven't done the initial load
        if (!initialLoadDoneRef.current) {
          unsubscribeMessages = subscribeToChatMessages(chatId, (updatedMessages) => {
            setMessages(updatedMessages);
            // Set loading to false and mark initial load done *after* first messages are received/processed
            if (!initialLoadDoneRef.current) { // Check again in case of rapid/multiple callbacks
                setIsLoading(false);
                initialLoadDoneRef.current = true;
            }
          });
        } else {
          // If initialLoadDoneRef is true, it means we've already subscribed and processed first batch.
          // Subsequent chatSnap changes (e.g. other participant details) won't re-subscribe to messages.
          // We might still be "loading" if messages haven't come through for the first time.
          // The primary setIsLoading(false) is in the message subscription callback.
          if(messages.length > 0 || initialLoadDoneRef.current) { // if messages have loaded or initial load says it's done
             setIsLoading(false);
          }
        }
      } else {
        setChatExists(false);
        setOtherParticipant(null);
        setMessages([]);
        setIsLoading(false); // Not loading if chat doesn't exist
        initialLoadDoneRef.current = true; // Mark as done, no messages to load
      }
    }, (error) => {
      console.error("Error fetching chat document:", error);
      setChatExists(false);
      setOtherParticipant(null);
      setMessages([]);
      setIsLoading(false);
      initialLoadDoneRef.current = true; // Mark as done on error too
    });

    return () => {
      unsubscribeChatDoc();
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [chatId, currentUser?.uid]); // Effect depends on chatId and the user's UID.

  useEffect(() => {
    if (messages.length > 0 && !isLoading && initialLoadDoneRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Image should be less than 5MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !currentUser?.uid || !chatId || !chatExists) return;

    setIsSending(true);
    let uploadedImageUrl: string | null = null;

    try {
      if (selectedFile) {
        try {
          const storagePath = `chatAttachments/${chatId}`;
          uploadedImageUrl = await uploadFileToStorage(selectedFile, storagePath);
        } catch (uploadError: any) {
          toast({
            title: "Image Upload Failed",
            description: uploadError.message || "Could not upload image.",
            variant: "destructive",
          });
          setIsSending(false);
          return;
        }
      }

      const result = await sendMessageAction(
        chatId,
        currentUser.uid,
        newMessage.trim() || null,
        uploadedImageUrl,
        currentUser.displayName || undefined,
        currentUser.photoURL || undefined
      );

      if (result.success) {
        setNewMessage('');
        removeSelectedFile();
      } else {
        throw new Error(result.error || "Failed to send message via server action.");
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: "Could not send message: " + error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // Initial loader covering auth check and initial chat existence check
  if (currentUser === undefined || (isLoading && chatExists === null)) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Initializing chat...</p>
      </div>
    );
  }

  if (currentUser === null) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
         <UserCircle2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
         <h2 className="text-2xl font-semibold mb-2">Login Required</h2>
         <p className="text-muted-foreground mb-6">Please log in to view and send messages.</p>
         <Button asChild className="mt-4">
           <Link href={`/auth/login?redirect=/messages/${chatId}`}>Login to Chat</Link>
         </Button>
      </div>
    );
  }

  if (chatExists === false && !isLoading) { // Explicitly check if chatExists is false and not loading
     return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center p-4 text-center">
        <MessageSquareText className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Chat Not Found</h2>
        <p className="text-muted-foreground mb-6">This conversation does not exist or you may not have access to it.</p>
        <Button asChild variant="outline">
          <Link href="/messages">Go to My Messages</Link>
        </Button>
      </div>
    );
  }

  // Skeleton loader: show if actively loading messages (isLoading true) AND chat doc exists (chatExists true) AND initial messages not yet loaded (initialLoadDoneRef false)
  if (isLoading && chatExists === true && !initialLoadDoneRef.current) {
     return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-card">
        <header className="flex items-center p-4 border-b bg-background shadow-sm">
            <Button variant="ghost" size="icon" className="mr-2 opacity-50" disabled><ArrowLeft className="h-6 w-6" /></Button>
            <Skeleton className="h-10 w-10 rounded-full mr-3" />
            <Skeleton className="h-6 w-32 rounded-md" />
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[...Array(5)].map((_, i) => <ChatMessageSkeleton key={i} isCurrentUser={i % 2 === 0} />)}
        </div>
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
        {otherParticipant ? (
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={otherParticipant?.photoURL || undefined} alt={otherParticipant?.displayName || "User"} data-ai-hint="user avatar"/>
              <AvatarFallback>{otherParticipant?.displayName ? otherParticipant.displayName.substring(0,1).toUpperCase() : "U"}</AvatarFallback>
            </Avatar>
        ) : (
            <Skeleton className="h-10 w-10 rounded-full mr-3" />
        )}
        {otherParticipant ? (
             <h2 className="text-xl font-semibold font-headline">{otherParticipant?.displayName || 'Chat'}</h2>
        ) : (
            <Skeleton className="h-6 w-32 rounded" />
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Show "No messages" only if not loading, chat exists, initial load is done, and messages array is empty */}
        {!isLoading && chatExists && initialLoadDoneRef.current && messages.length === 0 && !selectedFile ? (
          <div className="text-center text-muted-foreground py-10 flex flex-col items-center justify-center h-full">
            <MessageSquareText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No messages yet. Start the conversation or send an image!</p>
          </div>
        ) : (
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
                {msg.text && <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>}
                {msg.imageUrl && (
                  <Link href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block relative aspect-square max-w-[200px] max-h-[200px] rounded-md overflow-hidden border hover:opacity-80 transition-opacity">
                    <Image src={msg.imageUrl} alt="Chat image" fill style={{ objectFit: 'cover' }} data-ai-hint="chat sent image"/>
                  </Link>
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

      {filePreview && (
        <div className="p-4 border-t bg-background">
          <div className="flex items-center space-x-2">
            <Image src={filePreview} alt="Preview" width={48} height={48} className="h-12 w-12 rounded object-cover border" data-ai-hint="image preview"/>
            <p className="text-sm text-muted-foreground truncate flex-1">{selectedFile?.name}</p>
            <Button variant="ghost" size="icon" onClick={removeSelectedFile} disabled={isSending}>
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t bg-background">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" type="button" onClick={() => fileInputRef.current?.click()} disabled={isSending || isLoading || !chatExists}>
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp, image/gif"
            className="hidden"
            disabled={isSending || isLoading || !chatExists}
          />
          <Input
            type="text"
            value={newMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 h-10"
            disabled={isSending || isLoading || !chatExists}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e);}}
          />
          <Button type="submit" size="icon" disabled={isSending || (!newMessage.trim() && !selectedFile) || isLoading || !chatExists}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;

    