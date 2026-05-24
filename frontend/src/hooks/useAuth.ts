import { useAppDispatch, useAppSelector } from "@/store/hook";
import { setAuthState } from "@/store/slice/authSlice";
import { RootState } from "@/store/store";
import { ERoles, IUser } from "@/types/user.type";
import { useEffect } from "react";
import useFetchApi from "./useFetchApi";

const useAuth = () => {
  const dispatch = useAppDispatch();
  const { sessionToken } = useAppSelector(
    (state: RootState) => state.sessionToken
  );
  const persistedAuth = useAppSelector((state: RootState) => state.auth);
  const { data, refetch, loading } = useFetchApi<IUser>(
    sessionToken ? "/users/me" : ""
  );

  const user =
    sessionToken && data?.id
      ? data
      : sessionToken && persistedAuth.userInfo?.id
        ? persistedAuth.userInfo
        : null;

  const authLoading = Boolean(sessionToken && loading && !data?.id);

  useEffect(() => {
    if (!sessionToken) {
      dispatch(setAuthState({ userInfo: null, isLogin: false }));
      return;
    }
    if (data?.id) {
      dispatch(setAuthState({ userInfo: data, isLogin: true }));
    }
  }, [data, sessionToken, dispatch]);

  return {
    isLogin: Boolean(sessionToken && (user?.id || authLoading)),
    authLoading,
    role: user?.role,
    user,
    isAdmin: user?.role === ERoles.ADMIN,
    watchList: user?.watchList,
    updateUserInfo: refetch,
  };
};

export default useAuth;
