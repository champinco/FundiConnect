"use client";

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function Footer() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <footer className="bg-muted py-8 border-t">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} FundiConnect. All rights reserved.</p>
        <p className="text-sm mt-2">Connecting you with trusted artisans across Kenya.</p>
        <div className="mt-4 flex justify-center items-center space-x-4">
          <a href="/privacy-policy" className="hover:text-primary">Privacy Policy</a>
          <a href="/terms-of-service" className="hover:text-primary">Terms of Service</a>
          {currentUser && (
            <>
              <span>|</span>
              <Button variant="link" className="text-muted-foreground hover:text-primary p-0 h-auto" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
