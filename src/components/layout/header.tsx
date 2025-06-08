
// src/components/site-header.tsx
"use client"; 

import Link from "next/link";
import { siteConfig } from "@/config/site";
import { buttonVariants } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";

// Import necessary Firebase modules and React hooks
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; 
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";


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
      router.push('/auth/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

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
        <MainNav items={siteConfig.mainNav} />
        <div className="flex flex-1 items-center justify-end space-x-1 md:space-x-4">
          {/* Desktop Auth Links & Theme Toggle */}
          <nav className="hidden items-center space-x-1 md:flex">
            {currentUser ? (
              <>
                 <button
                    className={buttonVariants({ variant: "ghost" })}
                    onClick={handleLogout}
                  >
                   Logout
                 </button>
              </>
            ) : (
              <>
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

          {/* Mobile Menu Trigger */}
          <div className="md:hidden flex items-center">
            <ThemeToggle /> 
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <div className="flex h-full flex-col">
                  <div className="flex items-center justify-between border-b p-4">
                     <Link href="/" className="flex items-center space-x-2" onClick={() => setMobileNavOpen(false)}>
                        <Wrench className="h-6 w-6 text-primary" />
                        <span className="font-bold text-primary font-headline">{siteConfig.name}</span>
                    </Link>
                  </div>
                  <nav className="flex flex-col gap-3 p-4">
                    {siteConfig.mainNav.map((item) => (
                      item.href && (
                        <Link
                          key={item.href}
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
                  <div className="mt-auto border-t p-4">
                     {currentUser ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => { handleLogout(); setMobileNavOpen(false); }}
                        >
                          Logout
                        </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button asChild variant="outline" className="w-full">
                           <Link href="/auth/login" onClick={() => setMobileNavOpen(false)}>Login</Link>
                        </Button>
                         <Button asChild className="w-full">
                            <Link href="/auth/signup" onClick={() => setMobileNavOpen(false)}>Sign Up</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>
      </div>
    </header>
  );
}
