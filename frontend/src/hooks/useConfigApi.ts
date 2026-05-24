import { Api } from "@/api";
import { useAppDispatch, useAppSelector } from "@/store/hook";
import {
  deleteSessionToken,
  setSessionState,
} from "@/store/slice/sessionTokenSlice";
import { RootState } from "@/store/store";
import { useRouter } from "next/router";
import { useEffect } from "react";

const useConfigApi = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { sessionToken } = useAppSelector(
    (state: RootState) => state.sessionToken
  );
  useEffect(() => {
    const requestIntercept = Api.interceptors.request.use(
      (config) => {
        if (!config.headers["Authorization"]) {
          config.headers["Authorization"] = `Bearer ${sessionToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseIntercept = Api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const prevRequest = error?.config;
        if (
          error?.response?.status === 401 &&
          error?.response?.data?.error?.message === "Unauthorized" &&
          !prevRequest?.sent
        ) {
          prevRequest.sent = true;
          try {
            // Try refreshing the token
            const newToken = await refreshToken();

            if (newToken) {
              await fetch("/api/auth", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  data: newToken,
                }),
              });

              dispatch(
                setSessionState({ sessionToken: newToken?.accessToken })
              );
              prevRequest.headers[
                "Authorization"
              ] = `Bearer ${newToken?.accessToken}`;
              return Api(prevRequest);
            }
          } catch (refreshError) {
            console.error("Token refresh failed", refreshError);
          }
        }
        if (
          error?.response?.status === 498 ||
          error?.response?.data?.error?.message ===
            "Invalid or missing refresh token."
        ) {
          await fetch("/api/auth", { method: "DELETE" });
          dispatch(deleteSessionToken());
          router.push("/login");
          return;
        }

        return Promise.reject(error);
      }
    );

    return () => {
      Api.interceptors.request.eject(requestIntercept);
      Api.interceptors.response.eject(responseIntercept);
    };
  }, [sessionToken]);

  return Api;
};

const refreshToken = async () => {
  try {
    const response = await fetch("/api/auth", { method: "GET" });
    const data = await response.json();
    if (!data) return null;
    const oldRefreshToken = data?.refreshToken;
    console.log(oldRefreshToken);
    if (!oldRefreshToken) return;

    const responseSessionToken = await Api.post("/auth/token/refresh", {
      refreshToken: oldRefreshToken,
    });
    if (!responseSessionToken) return;
    const { accessToken, refreshToken } = responseSessionToken?.data?.data;

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
};

export default useConfigApi;
