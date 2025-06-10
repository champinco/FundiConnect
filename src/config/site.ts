
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
];

// Links that appear for logged-in users
const mainNavLinksLoggedIn = [
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
    href: "/profile/edit", // This link might need to be dynamic or lead to a general profile page
  },
];

// Links that appear for logged-out users (or all users if no auth distinction needed for these)
const mainNavLinksLoggedOut = [
   {
    title: "Smart Match", // Example: AI tool accessible to all
    href: "/smart-match",
  },
];


export const siteConfig = {
  name: "FundiConnect",
  description:
    "Find certified electricians, plumbers, and more in Kenya. Get quotes and connect with professionals for your home and business needs.",
  mainNav: mainNavLinksBase, // Base links always visible
  mainNavLoggedIn: mainNavLinksLoggedIn, // Additional links for logged-in users
  mainNavLoggedOut: mainNavLinksLoggedOut, // Additional links for logged-out users
  links: {
    twitter: "https://twitter.com/shadcn", // Replace with actual links
    github: "https://github.com/shadcn/ui", // Replace with actual links
  },
};
