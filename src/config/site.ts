
export type SiteConfig = typeof siteConfig;

const mainNavLinksBase = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Find Fundis",
    href: "/search",
  },
  {
    title: "Post a Job",
    href: "/jobs/post",
  },
  {
    title: "Smart Match",
    href: "/smart-match",
  },
];

// Links that appear ONLY for logged-in users
const mainNavLinksLoggedInExclusive = [
  {
    title: "Dashboard",
    href: "/dashboard",
  },
  {
    title: "Messages",
    href: "/messages",
  },
  {
    title: "My Profile", // Edit Profile for Providers, view for Clients
    href: "/profile/edit", 
  },
];

// Links that appear ONLY for logged-out users (or all users if no auth distinction needed for these)
const mainNavLinksLoggedOutExclusive = [
  // Example: A "Why Join?" page could go here, not relevant if already joined.
];


export const siteConfig = {
  name: "FundiConnect",
  description:
    "Find certified electricians, plumbers, and more in Kenya. Get quotes and connect with professionals for your home and business needs.",
  mainNav: mainNavLinksBase, // Base links always visible for all
  mainNavLoggedIn: mainNavLinksLoggedInExclusive, // Additional links ONLY for logged-in users
  mainNavLoggedOut: mainNavLinksLoggedOutExclusive, // Additional links ONLY for logged-out users
  links: {
    twitter: "https://twitter.com/shadcn", // Replace with actual links
    github: "https://github.com/shadcn/ui", // Replace with actual links
  },
};

