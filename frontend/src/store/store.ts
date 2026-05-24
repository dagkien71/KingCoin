import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { authReducer } from "./slice/authSlice";
import { sessionTokenReducer } from "./slice/sessionTokenSlice";

// configure which keuy we want to persist
const authPersistConfig = {
  key: "auth",
  storage: storage,
};

const sessionTokenPersistConfig = {
  key: "sessionToken",
  storage: storage,
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  sessionToken: persistReducer(sessionTokenPersistConfig, sessionTokenReducer),
});

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {},
      }),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
