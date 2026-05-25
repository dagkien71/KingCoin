import { IRegisterForm } from "./register-type";
import { validatePasswordStrength } from "./password-rules";

export const validateEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

export const validatePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  return /^[0-9]{10,11}$/.test(digits);
};

export const validateUsername = (username: string) => {
  const t = username.trim();
  return t.length >= 3 && t.length <= 32;
};

export const validateForm = (formData: IRegisterForm) => {
  const errors: IRegisterForm = {};

  if (!formData.email?.trim()) {
    errors.email = "Email không được để trống.";
  } else if (!validateEmail(formData.email)) {
    errors.email = "Email không hợp lệ.";
  }

  const phone = formData.phone?.trim();
  if (phone && !validatePhone(phone)) {
    errors.phone = "Số điện thoại không hợp lệ (10–11 chữ số).";
  }

  const username = formData.username?.trim();
  if (username && !validateUsername(username)) {
    errors.username = "Tên hiển thị phải từ 3–32 ký tự.";
  }

  const pwdErr = validatePasswordStrength(formData.password ?? "");
  if (pwdErr) {
    errors.password = pwdErr;
  }

  if (!formData.confirmPassword?.trim()) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
  }

  return errors;
};
