
export type SiteConfig = typeof siteConfig;

const mainNavLinks = [
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
    title: "Messages",
    href: "/messages",
  },
  {
    title: "Smart Match",
    href: "/smart-match",
  },
];

export const siteConfig = {
  name: "FundiConnect",
  description:
    "Find certified electricians, plumbers, and more in Kenya. Get quotes and connect with professionals for your home and business needs.",
  mainNav: mainNavLinks,
  links: {
    twitter: "https://twitter.com/shadcn", // Replace with actual links
    github: "https://github.com/shadcn/ui", // Replace with actual links
  },
};
