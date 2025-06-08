
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MainNavItem } from "@/types"; // Assuming a type definition, or define inline
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { Wrench } from 'lucide-react'; // Or your chosen logo icon

interface MainNavProps {
  items?: MainNavItem[]; // MainNavItem typically { title: string, href: string, disabled?: boolean, external?: boolean }
  children?: React.ReactNode;
}

// If MainNavItem is not defined in @/types, define it here or create @/types/index.d.ts
// For now, let's assume siteConfig.mainNav provides items with title and href.
// We'll use an inline assumption for item structure based on siteConfig.
type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
};


export function MainNav({ items, children }: MainNavProps) {
  const pathname = usePathname();
  const navItemsToRender = items || siteConfig.mainNav as NavItem[]; // Type assertion

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="flex items-center space-x-2">
        <Wrench className="h-6 w-6 text-primary" />
        <span className="inline-block font-bold font-headline text-primary">{siteConfig.name}</span>
      </Link>
      {navItemsToRender?.length ? (
        <nav className="hidden gap-6 md:flex">
          {navItemsToRender?.map((item, index) => (
            item.href && (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  "flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm",
                  item.href.startsWith(`${pathname}`) ? "text-foreground" : "text-foreground/60",
                  item.disabled && "cursor-not-allowed opacity-80"
                )}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer" : undefined}
              >
                {item.title}
                {item.label && (
                  <span className="ml-2 rounded-md bg-primary px-1.5 py-0.5 text-xs leading-none text-primary-foreground">
                    {item.label}
                  </span>
                )}
              </Link>
            )
          ))}
        </nav>
      ) : null}
      {children}
    </div>
  );
}
