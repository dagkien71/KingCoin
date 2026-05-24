export type IResponse<T = Record<string, unknown>> = {
  success: boolean;
  data: T;
};
