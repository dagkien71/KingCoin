export interface UserResponse {
  id: string;
  email: string;
  username: string | null;
  phone: string | null;
  walletAddress: string | null;
  avatar: string | null;
  balance: number;
  birthDate: Date | null;
  status: string;
  role: Roles;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
