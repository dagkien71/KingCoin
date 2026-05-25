export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 80;

/** Khớp rule `SignUpDto` trên backend. */
export function validatePasswordStrength(password: string): string | null {
  if (!password?.trim()) {
    return "Mật khẩu không được để trống.";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự.`;
  }
  if (/\s/.test(password)) {
    return "Mật khẩu không được chứa khoảng trắng.";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Mật khẩu phải có ít nhất một chữ cái.";
  }
  if (!/[\d\W]/.test(password)) {
    return "Mật khẩu phải có ít nhất một số hoặc ký tự đặc biệt.";
  }
  return null;
}
