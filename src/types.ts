export interface UserProfile {
  uid: string;
  email: string | null;
  fullName: string | null;
  displayName?: string | null;
  role: 'admin' | 'customer' | 'super_admin' | 'mechanic';
  createdAt: any;
  photoURL?: string | null;
  phone?: string | null;
  referralCode?: string;
  referredBy?: string;
  bonusBalance?: number;
  loyaltyPoints?: number;
  locationId?: string;
  profileCompleted?: boolean;
  address?: string;
  city?: string;
}

export type AuthState = {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMechanic: boolean;
};
