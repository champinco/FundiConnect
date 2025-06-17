
export type SiteConfig = typeof siteConfig;

const mainNavLinksBase = [
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
];

const mainNavLinksLoggedInExclusive = [
  {
    title: "Post a Job", // Moved from base for logged-in client context
    href: "/jobs/post",
    // Add a condition if you want to show this only for 'client' type users,
    // This would require accountType to be available in Header
  },
  {
    title: "My Jobs", // Added for clients
    href: "/jobs/my-jobs",
    // Add a condition if you want to show this only for 'client' type users
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
  // Example: Provider specific link
  // {
  //   title: "My Provider Dashboard", // If different from general dashboard
  //   href: "/provider/dashboard", 
  //   accountType: "provider" // Custom property to help Header filter
  // },
];

const mainNavLinksLoggedOutExclusive = [
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
