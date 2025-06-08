
export type AccountType = 'client' | 'provider';

export interface User {
  uid: string; // Firebase Auth UID
  email: string; // Email is now the primary identifier for auth
  fullName: string | null;
  phoneNumber?: string | null; // Phone number is now optional
  accountType: AccountType;
  photoURL?: string | null; // From Firebase Auth or custom
  providerProfileId?: string; // If accountType is 'provider', links to their ProviderProfile
  createdAt: Date;
  updatedAt: Date;
}
