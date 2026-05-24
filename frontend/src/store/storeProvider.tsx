"use client";
import { useRef } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { AppStore, makeStore } from "./store";
import { Persistor, persistStore } from "redux-persist";
let persistor: Persistor;
export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    persistor = persistStore(storeRef.current);
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate persistor={persistor}>{children}</PersistGate>
    </Provider>
  );
}
