import { IRegisterForm } from "./register-type";

export const validateEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string) => {
  return password.length >= 6;
};

export const validatePhone = (phone: string) => {
  const phoneRegex = /^[0-9]{10,11}$/;
  return phoneRegex.test(phone);
};

export const validateUsername = (username: string) => {
  return username.trim().length >= 3;
};

export const validateForm = (formData: IRegisterForm) => {
  const errors: IRegisterForm = {};

  if (!formData.email || !validateEmail(formData.email)) {
    errors.email = "Email không hợp lệ!";
  }

  if (!formData.phone || !validatePhone(formData.phone)) {
    errors.phone = "Số điện thoại không hợp lệ (10-11 chữ số)!";
  }

  if (!formData.username || !validateUsername(formData.username)) {
    errors.username = "Tên người dùng phải có ít nhất 3 ký tự!";
  }

  if (!formData.password || !validatePassword(formData.password)) {
    errors.password = "Mật khẩu phải có ít nhất 6 ký tự!";
  }

  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp!";
  }

  return errors;
};
