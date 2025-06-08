
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Briefcase, Users, Sparkles, MessageSquare } from 'lucide-react'; // Added MessageSquare

export default function Header() {
  const navItems = [
    { href: '/', label: 'Home', icon: <Briefcase className="h-5 w-5" /> },
    { href: '/search', label: 'Find Fundis', icon: <Users className="h-5 w-5" /> },
    { href: '/smart-match', label: 'Smart Match', icon: <Sparkles className="h-5 w-5" /> },
    { href: '/jobs/post', label: 'Post a Job', icon: <Briefcase className="h-5 w-5" /> },
    { href: '/messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> }, // New Messages Link
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary">
            <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.173A.75.75 0 003 6.825v10.35a.75.75 0 00.366.652l8.256 4.571a.75.75 0 00.756 0l8.256-4.571a.75.75 0 00.366-.652V6.825a.75.75 0 00-.366-.652L12.378 1.602zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
            <path d="M16.014 12a4.014 4.014 0 01-4.014 4.014V12h4.014z" />
          </svg>
          <span className="font-bold text-2xl font-headline text-primary">FundiConnect</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col space-y-4 p-4">
                <Link href="/" className="mb-4">
                  <span className="font-bold text-xl font-headline text-primary">FundiConnect</span>
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
