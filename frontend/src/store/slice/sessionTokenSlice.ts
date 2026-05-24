import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ISessionTokenState {
  sessionToken: string | null; // Stores the session token if logged in
}

const initialState: ISessionTokenState = {
  sessionToken: null,
};

export const sessionTokenSlice = createSlice({
  name: "sessionToken",
  initialState,
  reducers: {
    get: (state, action: PayloadAction<string>) => {
      state.sessionToken = action.payload; // Store the session token
    },
    setSessionState: (
      state,
      action: PayloadAction<{ sessionToken?: string }>
    ) => {
      state.sessionToken = action.payload.sessionToken ?? null; // Assign null as default value if sessionToken is undefined
    },
    deleteSessionToken: (state) => {
      state.sessionToken = null; // Clear the session token
    },
  },
});

export const { get, setSessionState, deleteSessionToken } =
  sessionTokenSlice.actions;
export const sessionTokenReducer = sessionTokenSlice.reducer;
