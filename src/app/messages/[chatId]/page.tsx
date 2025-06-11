
"use client";

import type { NextPage } from 'next';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 
import { subscribeToChatMessages, sendMessage } from '@/services/chatService';
import type { ChatMessage, ChatParticipant, Chat } from '@/models/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Send, Paperclip, Loader2, UserCircle2, MessageSquareText, XCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import ChatMessageSkeleton from '@/components/skeletons/chat-message-skeleton';
import { Skeleton } from '@/components/ui/skeleton'; // For header skeleton
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

  useEffect(() => {
    setIsLoading(true); 
    initialLoadDoneRef.current = false; 

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); 
      if (!user && chatId) { 
        setIsLoading(false); 
      }
    });
    return () => unsubscribeAuth();
  }, [chatId]); 

  useEffect(() => {
    if (currentUser === undefined || !chatId) {
      return; 
    }

    if (!currentUser?.uid) { 
      setIsLoading(false);
      setChatExists(false); // No user, so no chat access.
      return;
    }
    
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
        
        const unsubscribeMessages = subscribeToChatMessages(chatId, (updatedMessages) => {
          setMessages(updatedMessages);
          if (!initialLoadDoneRef.current) {
            setIsLoading(false); 
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
    if (messages.length > 0 && !isLoading) { 
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

      await sendMessage(chatId, currentUser.uid, newMessage.trim() || null, uploadedImageUrl);
      setNewMessage('');
      removeSelectedFile();

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({ title: "Error", description: "Could not send message: " + error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };
  
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
  
  if (chatExists === false && !isLoading) { 
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

  if (isLoading && chatExists === true && !initialLoadDoneRef.current) { // Show full page skeleton
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
        {!isLoading && messages.length === 0 && !selectedFile && chatExists && initialLoadDoneRef.current ? ( 
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
