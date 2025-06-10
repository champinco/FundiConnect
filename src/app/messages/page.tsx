
"use client";

import type { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { subscribeToUserChats, markMessagesAsRead } from '@/services/chatService';
import type { Chat } from '@/models/chat';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquareText, Users, Loader2, Inbox } from 'lucide-react'; 
import { formatDistanceToNowStrict } from 'date-fns';
import ChatListItemSkeleton from '@/components/skeletons/chat-list-item-skeleton';

const MessagesPage: NextPage = () => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      setIsLoading(true);
      const unsubscribeChats = subscribeToUserChats(currentUser.uid, (updatedChats) => {
        setChats(updatedChats);
        setIsLoading(false);
      });
      return () => unsubscribeChats();
    } else {
      setChats([]); 
      if (auth.currentUser === null) setIsLoading(false); 
    }
  }, [currentUser]);

  const getOtherParticipant = (chat: Chat) => {
    if (!currentUser) return null;
    const otherUid = chat.participantUids.find(uid => uid !== currentUser.uid);
    return otherUid ? chat.participants[otherUid] : { uid: otherUid || 'unknown', displayName: "Unknown User" };
  };

  const handleChatOpen = (chatId: string) => {
    if (currentUser?.uid) {
      markMessagesAsRead(chatId, currentUser.uid);
    }
  };


  if (isLoading && !currentUser && currentUser !== null) { 
     return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Verifying authentication...</p>
      </div>
    );
  }

  if (!currentUser && !isLoading) { 
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need to be logged in to view your messages.</CardDescription>
          </CardHeader>
          <CardContent>
            <Users className="h-16 w-16 text-primary mx-auto mb-4 opacity-70" />
            <p className="text-muted-foreground mb-6">Please log in to continue.</p>
            <Button asChild className="mt-4">
              <Link href="/auth/login?redirect=/messages">Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-3xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <MessageSquareText className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl font-headline">Your Conversations</CardTitle>
          </div>
          <CardDescription>View and manage your ongoing chats with Fundis and clients.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && chats.length === 0 ? (
            <ul className="space-y-3">
              {[...Array(3)].map((_, i) => <ChatListItemSkeleton key={i} />)}
            </ul>
          ) : !isLoading && chats.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center">
              <Inbox className="h-20 w-20 text-primary opacity-60 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Conversations Yet</h3>
              <p className="text-muted-foreground mb-4">Your message inbox is empty.</p>
              <p className="text-sm text-muted-foreground">
                Start a chat by contacting a Fundi from their profile or by replying to a job quote.
              </p>
               <Button asChild className="mt-6">
                 <Link href="/search">Find a Fundi</Link>
               </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {chats.map((chat) => {
                const otherParticipant = getOtherParticipant(chat);
                const lastMessageText = chat.lastMessage?.text || "No messages yet...";
                const lastMessageTime = chat.lastMessage?.timestamp 
                  ? formatDistanceToNowStrict(new Date(chat.lastMessage.timestamp), { addSuffix: true })
                  : '';
                
                const isUnread = chat.lastMessage && 
                                 chat.lastMessage.senderUid !== currentUser?.uid && 
                                 !chat.lastMessage.isReadBy?.[currentUser?.uid || ''];


                return (
                  <li key={chat.id}>
                    <Link href={`/messages/${chat.id}`} legacyBehavior passHref>
                      <a 
                        onClick={() => handleChatOpen(chat.id)} 
                        className={`block p-4 rounded-lg hover:bg-muted transition-colors border ${isUnread ? 'border-primary bg-primary/5' : 'bg-card'}`}
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={otherParticipant?.photoURL || undefined} alt={otherParticipant?.displayName || 'User'} data-ai-hint="profile avatar"/>
                            <AvatarFallback>
                              {otherParticipant?.displayName ? otherParticipant.displayName.substring(0, 2).toUpperCase() : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className={`text-lg font-semibold font-headline truncate ${isUnread ? 'text-primary' : ''}`}>
                                {otherParticipant?.displayName || 'User'}
                              </p>
                              {chat.lastMessage?.timestamp && (
                                <p className={`text-xs text-muted-foreground whitespace-nowrap ${isUnread ? 'font-medium text-primary/80' : ''}`}>
                                  {lastMessageTime}
                                </p>
                              )}
                            </div>
                            <p className={`text-sm text-muted-foreground truncate ${isUnread ? 'font-medium' : ''}`}>
                              {chat.lastMessage?.senderUid === currentUser?.uid ? "You: " : ""}
                              {lastMessageText}
                            </p>
                          </div>
                           {isUnread && (
                            <span className="w-3 h-3 bg-accent rounded-full shrink-0" title="Unread messages"></span>
                          )}
                        </div>
                      </a>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagesPage;
