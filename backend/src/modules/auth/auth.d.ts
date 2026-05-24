declare namespace Auth {
  export interface AccessRefreshTokens {
    accessToken: string;
    refreshToken: string;
  }

  export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
  }
}
