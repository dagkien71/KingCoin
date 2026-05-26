import { IOrder } from "./order.type";

export enum ERoles {
  ADMIN = "admin",
  USER = "user",
  AGENT = "agent",
}

export interface IUser {
  id: string;
  email: string;
  phone?: string;
  username?: string;
  password: string;
  walletAddress?: string;
  walletCode?: string | null;
  avatar?: string;
  balance?: number;
  dailyPnL?: number;
  weeklyPnL?: number;
  monthlyPnL?: number;
  dailyPnLPercent?: number;
  weeklyPnLPercent?: number;
  navBaselineDayKc?: number | null;
  navBaselineWeekKc?: number | null;
  isVerified?: boolean;
  emailVerifiedAt?: string | null;
  pendingEmail?: string | null;
  birthDate?: string;
  createdAt?: string;
  status?: string;
  socialLinks?: string[];
  introduction?: string | null;
  role: ERoles;
  watchList?: string[];
  completedTours?: string[];
  orders: IOrder[];
}
