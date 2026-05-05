export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string | null;
  displayName?: string | null;
  role: 'admin' | 'customer';
  createdAt: any;
  photoURL?: string | null;
  phone?: string | null;
  referralCode?: string;
  bonusBalance?: number;
}

export type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
};
