import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setAuthState } from "@/store/slice/authSlice";
import { RootState } from "@/store/store";
import { ERoles, IUser } from "@/types/user.type";
import { useEffect } from "react";
import useLiveFetch from "./useLiveFetch";

const useAuth = () => {
  const dispatch = useAppDispatch();
  const { sessionToken } = useAppSelector(
    (state: RootState) => state.sessionToken
  );
  const { data, refetch } = useLiveFetch<IUser | null>(
    sessionToken ? "/users/me" : "",
    { stream: "trades" }
  );

  const user = sessionToken && data?.id ? data : null;

  useEffect(() => {
    if (!sessionToken) {
      dispatch(setAuthState({ userInfo: null, isLogin: false }));
      return;
    }
    if (data?.id) {
      dispatch(setAuthState({ userInfo: data, isLogin: true }));
    } else if (data === null) {
      dispatch(setAuthState({ userInfo: null, isLogin: false }));
    }
  }, [data, sessionToken, dispatch]);

  return {
    isLogin: Boolean(sessionToken && user?.id),
    role: user?.role,
    user,
    isAdmin: user?.role === ERoles.ADMIN,
    watchList: user?.watchList,
    updateUserInfo: refetch,
  };
};

export default useAuth;
