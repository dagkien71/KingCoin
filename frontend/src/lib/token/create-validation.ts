import { ICreateTokenCrypto } from "@/types/token.type";

export const validateFormSubmit = (form: ICreateTokenCrypto) => {
  const errors: { [key: string]: string } = {};

  if (!form?.name) {
    errors.name = "Tên coin là bắt buộc";
  } else if (!/[a-zA-Z]/.test(form.name)) {
    errors.name = "Tên coin phải chứa ít nhất một chữ cái";
  }

  if (!form?.symbol) {
    errors.symbol = "Biểu tượng là bắt buộc";
  } else if (!/[a-zA-Z]/.test(form.symbol)) {
    errors.symbol = "Biểu tượng phải chứa ít nhất một chữ cái";
  }

  if (form?.decimals <= 0) {
    errors.decimals = "Số thập phân phải lớn hơn 0";
  }

  if (form?.initialPrice <= 0) {
    errors.initialPrice = "Giá phải lớn hơn 0";
  }

  if (form?.totalSupply <= 0) {
    errors.totalSupply = "Tổng cung phải lớn hơn 0";
  }

  if (!form?.description) {
    errors.description = "Mô tả là bắt buộc";
  }

  if (form?.totalSupply < 0) {
    errors.totalSupply = "Tổng cung không thể là số âm";
  }

  return errors;
};
