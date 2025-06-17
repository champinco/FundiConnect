
"use client"; 

import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Wrench, LogOut, UserCircle, LogIn, UserPlus, LayoutDashboard, MessageSquare, Settings, Briefcase, ListChecks, Edit3, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavItem } from "@/types";
import type { AccountType } from "@/models/user";
import { fetchCurrentAppUserTypeAction } from "@/app/profile/actions";
import NotificationDropdown from '@/components/notification-dropdown';
import { getUnreadNotificationCountAction } from '@/app/actions/notification_actions';


export function SiteHeader() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); 
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);

  const fetchUnreadCount = useCallback(async (userId: string | null) => {
    if (userId) {
      const count = await getUnreadNotificationCountAction(userId);
      setUnreadNotificationCount(count);
    } else {
      setUnreadNotificationCount(0);
    }
  }, []);

  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const type = await fetchCurrentAppUserTypeAction(user.uid);
        setAccountType(type);
        fetchUnreadCount(user.uid);
      } else {
        setAccountType(null);
        setUnreadNotificationCount(0);
      }
      setLoadingAuth(false); 
    });
    return () => unsubscribe();
  }, [fetchUnreadCount]); 

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAccountType(null); 
      setMobileNavOpen(false);
      setUnreadNotificationCount(0); 
      router.push('/'); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  
  const handleNotificationDropdownOpenChange = (open: boolean) => {
    setIsNotificationDropdownOpen(open);
    if (open && currentUser) {
      // Optionally, re-fetch notifications or count when dropdown is opened
      // For now, count updates via onUnreadCountChange from NotificationDropdown
    }
  };

  const baseNavItems: NavItem[] = [...siteConfig.mainNav];
  
  let userSpecificNavItems: NavItem[] = [];
  if (currentUser) {
    userSpecificNavItems = siteConfig.mainNavLoggedIn.filter(item => {
      if (item.title === "Post a Job" || item.title === "My Jobs") {
        return accountType === 'client';
      }
      return true; 
    });
  }


  if (loadingAuth && !currentUser) { 
    return (
       <header className="sticky top-0 z-40 w-full border-b bg-background">
         <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
            <Link href="/" className="flex items-center space-x-2">
              <Wrench className="h-6 w-6 text-primary" />
              <span className="inline-block font-bold font-headline text-primary">{siteConfig.name}</span>
            </Link>
             <div className="flex flex-1 items-center justify-end space-x-4">
                <div className="h-6 w-20 animate-pulse rounded-md bg-muted"></div>
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
             </div>
         </div>
       </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={baseNavItems} />
        
        <div className="flex flex-1 items-center justify-end space-x-1 md:space-x-2">
          <nav className="hidden items-center space-x-1 md:flex">
            {currentUser && (
              <DropdownMenu onOpenChange={handleNotificationDropdownOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-background" />
                    )}
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-0">
                  {isNotificationDropdownOpen && ( // Render only when open to fetch fresh data
                    <NotificationDropdown 
                      userId={currentUser.uid} 
                      initialUnreadCount={unreadNotificationCount}
                      onUnreadCountChange={setUnreadNotificationCount}
                      onClose={() => setIsNotificationDropdownOpen(false)}
                    />
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || "User"} data-ai-hint="user avatar" />
                      <AvatarFallback>
                        {currentUser.displayName ? currentUser.displayName.substring(0,1).toUpperCase() : currentUser.email ? currentUser.email.substring(0,1).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none truncate">
                        {currentUser.displayName || currentUser.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userSpecificNavItems.map((item) => (
                     item.href && (
                        <DropdownMenuItem key={`desktop-${item.href}`} asChild>
                            <Link href={item.href}>
                                {item.title === "Dashboard" && <LayoutDashboard className="mr-2 h-4 w-4" />}
                                {item.title === "Messages" && <MessageSquare className="mr-2 h-4 w-4" />}
                                {item.title === "My Profile" && <UserCircle className="mr-2 h-4 w-4" />}
                                {item.title === "Post a Job" && <Edit3 className="mr-2 h-4 w-4" />}
                                {item.title === "My Jobs" && <ListChecks className="mr-2 h-4 w-4" />}
                                {item.title}
                            </Link>
                        </DropdownMenuItem>
                     )
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={cn(buttonVariants({ variant: "ghost" }), "text-sm")}
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className={cn(buttonVariants({ variant: "default", size:"sm" }), "text-sm")}
                >
                  Sign Up
                </Link>
              </>
            )}
            <ThemeToggle />
          </nav>

          {/* Mobile Menu Button & Sheet */}
          <div className="md:hidden flex items-center">
             {!loadingAuth && <ThemeToggle />} 
             {currentUser && !loadingAuth && (
                <DropdownMenu onOpenChange={handleNotificationDropdownOpenChange}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {unreadNotificationCount > 0 && (
                        <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-destructive ring-1 ring-background" />
                      )}
                      <span className="sr-only">Notifications</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-0">
                     {isNotificationDropdownOpen && (
                        <NotificationDropdown 
                          userId={currentUser.uid} 
                          initialUnreadCount={unreadNotificationCount}
                          onUnreadCountChange={setUnreadNotificationCount}
                          onClose={() => setIsNotificationDropdownOpen(false)}
                        />
                      )}
                  </DropdownMenuContent>
                </DropdownMenu>
             )}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-1">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="flex items-center">
                     <Link href="/" className="flex items-center space-x-2" onClick={() => setMobileNavOpen(false)}>
                        <Wrench className="h-6 w-6 text-primary" />
                        <span className="font-bold text-primary font-headline">{siteConfig.name}</span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>

                {currentUser && (
                  <div className="p-4 border-b">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || "User"} data-ai-hint="user avatar"/>
                        <AvatarFallback>
                          {currentUser.displayName ? currentUser.displayName.substring(0,1).toUpperCase() : currentUser.email ? currentUser.email.substring(0,1).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm truncate">{currentUser.displayName || currentUser.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                        {accountType && <p className="text-xs text-muted-foreground capitalize">Role: {accountType}</p>}
                      </div>
                    </div>
                  </div>
                )}

                <nav className="flex-grow p-4 space-y-1">
                  {baseNavItems.map((item) => (
                    item.href && (
                      <Link
                        key={`mobile-base-${item.href}`}
                        href={item.href}
                        className="block rounded-md px-3 py-2 text-base font-medium hover:bg-muted"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <span className="flex items-center">
                          {item.title === "Browse Jobs" && <Briefcase className="inline-block mr-2 h-5 w-5" />}
                          {item.title}
                        </span>
                      </Link>
                    )
                  ))}
                  {currentUser && userSpecificNavItems.map((item) => (
                    item.href && (
                        <Link
                            key={`mobile-user-${item.href}`}
                            href={item.href}
                            className="flex items-center rounded-md px-3 py-2 text-base font-medium hover:bg-muted"
                            onClick={() => setMobileNavOpen(false)}
                        >
                            {item.title === "Dashboard" && <LayoutDashboard className="mr-2 h-5 w-5" />}
                            {item.title === "Messages" && <MessageSquare className="mr-2 h-5 w-5" />}
                            {item.title === "My Profile" && <UserCircle className="mr-2 h-5 w-5" />}
                            {item.title === "Post a Job" && <Edit3 className="mr-2 h-5 w-5" />}
                            {item.title === "My Jobs" && <ListChecks className="mr-2 h-5 w-5" />}
                            {item.title}
                        </Link>
                    )
                  ))}
                </nav>
                
                <Separator />

                <div className="p-4 space-y-2">
                   {currentUser ? (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => {handleLogout();}}
                      >
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </Button>
                  ) : (
                    <>
                      <Button asChild variant="default" className="w-full justify-start">
                         <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}>
                           <span className="flex items-center">
                             <LogIn className="mr-2 h-4 w-4" />Login
                           </span>
                         </Link>
                      </Button>
                       <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/auth/signup" onClick={() => setMobileNavOpen(false)}>
                            <span className="flex items-center">
                              <UserPlus className="mr-2 h-4 w-4" />Sign Up
                            </span>
                          </Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
