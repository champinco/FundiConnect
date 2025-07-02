
// This is a basic definition. Expand as needed.
export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  description?: string;
  accountType?: 'client' | 'provider';
}

// You can add other shared types here, e.g.:
// export interface UserProfile { ... }
// export interface JobDetails { ... }

// MainNav specific item type, if it differs or needs to be more specific
// than the general NavItem. For now, we can assume NavItem is sufficient.
export type MainNavItem = NavItem;
