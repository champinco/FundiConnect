
export type SiteConfig = typeof siteConfig;

const mainNavLinksBase = [
  {
    title: "Home",
    href: "/",
  },
  {
    title: "Find Fundis",
    href: "/search?mode=providers",
  },
  {
    title: "Browse Jobs", // Added
    href: "/jobs",
  },
  {
    title: "Smart Match",
    href: "/smart-match",
  },
];

const mainNavLinksLoggedInExclusive = [
  {
    title: "Post a Job", // Moved from base
    href: "/jobs/post",
  },
  {
    title: "My Jobs", // Added
    href: "/jobs/my-jobs",
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
    title: "My Profile",
    href: "/profile",
  },
];

const mainNavLinksLoggedOutExclusive = [
  // Example: { title: "Pricing", href: "/pricing" }
];


export const siteConfig = {
  name: "FundiConnect",
  description:
    "Find certified electricians, plumbers, and more in Kenya. Get quotes and connect with professionals for your home and business needs.",
  mainNav: mainNavLinksBase,
  mainNavLoggedIn: mainNavLinksLoggedInExclusive,
  mainNavLoggedOut: mainNavLinksLoggedOutExclusive,
  links: {
    twitter: "https://twitter.com/shadcn", // Replace with actual links
    github: "https://github.com/shadcn/ui", // Replace with actual links
  },
};
