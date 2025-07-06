
import type { NavItem } from "@/types";

export type SiteConfig = typeof siteConfig;

const mainNavLinksBase: NavItem[] = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Find Fundis",
    href: "/search?mode=providers", // Specify mode for clarity
  },
  {
    title: "Browse Jobs", // Added for all users
    href: "/jobs",
  },
  {
    title: "Smart Match",
    href: "/smart-match",
  },
  {
    title: "AI Job Triage",
    href: "/tools/job-triage",
  },
];

const mainNavLinksLoggedInExclusive: NavItem[] = [
  {
    title: "Post a Job",
    href: "/jobs/post",
    accountType: 'client'
  },
  {
    title: "My Jobs",
    href: "/jobs/my-jobs",
    accountType: 'client'
  },
  {
    title: "Resources",
    href: "/resources",
    accountType: 'provider'
  },
  {
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    title: "Messages",
    href: "/messages",
  },
  {
    title: "My Profile", // Generic profile link
    href: "/profile",
  },
];

const mainNavLinksLoggedOutExclusive: NavItem[] = [
  // Example: { title: "Pricing", href: "/pricing" }
];


export const siteConfig = {
  name: "FundiConnect",
  description:
    "Find certified electricians, plumbers, and more in Kenya. Get quotes and connect with professionals for your home and business needs.",
  mainNav: mainNavLinksBase, // Publicly visible links
  mainNavLoggedIn: mainNavLinksLoggedInExclusive, // Links visible only when logged in
  mainNavLoggedOut: mainNavLinksLoggedOutExclusive, // Links visible only when logged out (if any)
  links: {
    twitter: "https://twitter.com/FundiConnectApp", // Placeholder updated
    github: "https://github.com/FundiConnect", // Placeholder updated
  },
};
