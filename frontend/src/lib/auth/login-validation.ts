import { validatePasswordStrength } from "./password-rules";

export const validateEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

export const validateForm = (email: string, password: string) => {
  const errors: { email?: string; password?: string } = {};

  if (!email?.trim()) {
    errors.email = "Email không được để trống.";
  } else if (!validateEmail(email)) {
    errors.email = "Email không hợp lệ.";
  }

  const pwdErr = validatePasswordStrength(password);
  if (pwdErr) {
    errors.password = pwdErr;
  }

  return errors;
};
