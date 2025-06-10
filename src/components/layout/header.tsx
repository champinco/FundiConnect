
"use client"; 

import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Wrench, LogOut, UserCircle, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { NavItem } from "@/types"; // Assuming or creating this type


export function SiteHeader() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); 
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false); 
    });
    return () => unsubscribe();
  }, []); 

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null); 
      router.push('/auth/login');
      setMobileNavOpen(false); 
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Construct navigation items based on authentication state
  let mainNavDisplayItems: NavItem[] = [...siteConfig.mainNav];
  let mobileNavDisplayItems: NavItem[] = [...siteConfig.mainNav];

  if (currentUser) {
    mainNavDisplayItems = [...mainNavDisplayItems, ...siteConfig.mainNavLoggedIn.filter(item => !mainNavDisplayItems.find(i => i.href === item.href))];
    mobileNavDisplayItems = [...mobileNavDisplayItems, ...siteConfig.mainNavLoggedIn.filter(item => !mobileNavDisplayItems.find(i => i.href === item.href))];
  } else {
    // For logged-out users, we might have specific links (though mainNavLoggedOut is empty in current config)
    mainNavDisplayItems = [...mainNavDisplayItems, ...siteConfig.mainNavLoggedOut.filter(item => !mainNavDisplayItems.find(i => i.href === item.href))];
    mobileNavDisplayItems = [...mobileNavDisplayItems, ...siteConfig.mainNavLoggedOut.filter(item => !mobileNavDisplayItems.find(i => i.href === item.href))];
  }


  if (loadingAuth) {
    return (
       <header className="sticky top-0 z-40 w-full border-b bg-background">
         <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
            <Link href="/" className="flex items-center space-x-2">
              <Wrench className="h-6 w-6 text-primary" />
              <span className="inline-block font-bold font-headline text-primary">{siteConfig.name}</span>
            </Link>
             <div className="flex flex-1 items-center justify-end space-x-4">
               <span className="text-sm text-muted-foreground">Loading...</span>
             </div>
         </div>
       </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={mainNavDisplayItems.filter(item => 
            // Filter out items that are handled by dedicated buttons like Login/Logout/Signup or special user links
            !["/auth/login", "/auth/signup"].includes(item.href) &&
            (currentUser ? !["My Profile", "Messages", "Dashboard"].includes(item.title) : true) // Example: don't show these in MainNav if handled by specific buttons
        )} />
        
        <div className="flex flex-1 items-center justify-end space-x-1 md:space-x-4">
          <nav className="hidden items-center space-x-1 md:flex">
            {currentUser ? (
              <>
                {siteConfig.mainNavLoggedIn.map((item) => ( // These are specific user action links
                  item.href && (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        buttonVariants({ variant: "ghost" }),
                        "text-sm font-medium"
                      )}
                    >
                      {item.title}
                    </Link>
                  )
                ))}
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="text-sm font-medium"
                  >
                   Logout
                 </Button>
              </>
            ) : (
              <>
                {/* Add any specific logged-out links from siteConfig.mainNavLoggedOut here if needed, 
                    otherwise MainNav already handles common links like Smart Match */}
                <Link
                  href="/auth/login"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className={buttonVariants({ variant: "default", size:"sm" })}
                >
                  Sign Up
                </Link>
              </>
            )}
            <ThemeToggle />
          </nav>

          <div className="md:hidden flex items-center">
            <ThemeToggle /> 
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
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
                      <Avatar>
                        <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || "User"} data-ai-hint="user avatar"/>
                        <AvatarFallback>
                          {currentUser.displayName ? currentUser.displayName.substring(0,1).toUpperCase() : currentUser.email ? currentUser.email.substring(0,1).toUpperCase() : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm truncate">{currentUser.displayName || currentUser.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                <nav className="flex-grow p-4 space-y-1">
                  {/* Use mobileNavDisplayItems for the mobile menu */}
                  {mobileNavDisplayItems.map((item) => (
                    item.href && (
                      <Link
                        key={`mobile-${item.href}`}
                        href={item.href}
                        className={cn(
                          "block rounded-md px-3 py-2 text-base font-medium hover:bg-muted",
                        )}
                        onClick={() => setMobileNavOpen(false)}
                      >
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
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" /> Logout
                      </Button>
                  ) : (
                    <>
                      <Button asChild variant="default" className="w-full justify-start">
                         <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}><LogIn className="mr-2 h-4 w-4" />Login</Link>
                      </Button>
                       <Button asChild variant="outline" className="w-full justify-start">
                          <Link href="/auth/signup" onClick={() => setMobileNavOpen(false)}><UserPlus className="mr-2 h-4 w-4" />Sign Up</Link>
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

// Define NavItem type if not already defined in src/types/index.d.ts or similar
// For example:
// export interface NavItem {
//   title: string
//   href: string
//   disabled?: boolean
//   external?: boolean
//   icon?: React.ComponentType<{ className?: string }>
//   label?: string
//   description?: string
// }
