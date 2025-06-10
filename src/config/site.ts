
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

// Links that appear ONLY for logged-in users, in addition to base links
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
    title: "My Profile", 
    href: "/profile", // Changed from /profile/edit to /profile
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
  mainNav: mainNavLinksBase, 
  mainNavLoggedIn: mainNavLinksLoggedInExclusive, 
  mainNavLoggedOut: mainNavLinksLoggedOutExclusive,
  links: {
    twitter: "https://twitter.com/shadcn", 
    github: "https://github.com/shadcn/ui", 
  },
};
