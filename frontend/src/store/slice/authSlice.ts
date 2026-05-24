import { IUser } from "@/types/user.type";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface IAuthState {
  isLogin: boolean;
  userInfo: IUser | null; // Stores user information if logged in
}

const initialState: IAuthState = {
  isLogin: false,
  userInfo: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<IUser>) => {
      state.isLogin = true; // User is authenticated
      state.userInfo = action.payload; // Store user information
    },
    logout: (state) => {
      state.isLogin = false; // Reset authentication state
      state.userInfo = null; // Clear user information
    },
    setAuthState: (state, action: PayloadAction<IAuthState>) => {
      state.isLogin = action.payload.isLogin;
      state.userInfo = action.payload.userInfo;
    },
  },
});

export const { login, logout, setAuthState } = authSlice.actions;
export const authReducer = authSlice.reducer;
