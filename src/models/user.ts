
export type AccountType = 'client' | 'provider';

export interface User {
  uid: string; // Firebase Auth UID
  email: string | null; // Email is no longer collected at signup
  fullName: string | null;
  phoneNumber: string | null; // Primary identifier for authentication
  accountType: AccountType;
  photoURL?: string | null; // From Firebase Auth or custom
  providerProfileId?: string; // If accountType is 'provider', links to their ProviderProfile
  createdAt: Date;
  updatedAt: Date;
}
