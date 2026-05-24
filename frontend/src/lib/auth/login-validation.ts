export const validateEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string) => {
  return password.length >= 6;
};

export const validateForm = (email: string, password: string) => {
  const errors: { email?: string; password?: string } = {};

  if (!validateEmail(email)) {
    errors.email = "Email không hợp lệ!";
  }

  if (!validatePassword(password)) {
    errors.password = "Mật khẩu phải có ít nhất 6 ký tự!";
  }

  return errors;
};
