import { Wrench, Facebook, Twitter, Linkedin } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'LinkedIn', icon: Linkedin, href: '#' },
  ];

  const customerLinks = [
    { name: 'Find a Fundi', href: '/search?mode=providers' },
    { name: 'Book Services', href: '/search?mode=providers' },
    { name: 'Track Orders', href: '#' }, 
    { name: 'Help Center', href: '/help-center', external: false }, 
  ];

  const fundiLinks = [
    { name: 'Join as Fundi', href: '/auth/signup' },
    { name: 'Fundi App', href: '/dashboard' },
    { name: 'Resources', href: '/resources' }, 
    { name: 'Support', href: '#' },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo and Tagline */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Wrench className="h-7 w-7 text-primary" />
              <span className="text-xl font-bold text-white font-headline">FundiConnect</span>
            </Link>
            <p className="text-sm max-w-sm mb-4">
              Connecting skilled professionals with customers across East Africa. Quality service, verified professionals, secure transactions.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-slate-400 hover:text-white"
                  aria-label={social.name}
                >
                  <social.icon className="h-6 w-6" />
                </a>
              ))}
            </div>
          </div>

          {/* Customer Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">For Customers</h3>
            <ul className="space-y-3">
              {customerLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="hover:text-white transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Fundi Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">For Fundis</h3>
            <ul className="space-y-3">
              {fundiLinks.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="hover:text-white transition-colors text-sm">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center text-sm">
          <p className="text-slate-400">&copy; {new Date().getFullYear()} FundiConnect. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="hover:text-white">
              Terms of Service
            </Link>
            <a href="#" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
