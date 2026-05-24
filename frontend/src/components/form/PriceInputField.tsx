"use client";

import {
  formatInputPrice,
  parseInputPrice,
  roundInputPrice,
} from "@/utils/format-number";
import clsx from "clsx";
import { useField } from "formik";
import { useEffect, useState } from "react";

type Props = {
  name: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

/**
 * Ô nhập giá: hiển thị vi-VN với đúng 4 chữ số sau dấu phẩy; lưu number trong Formik.
 */
export default function PriceInputField({
  name,
  disabled,
  className,
  placeholder = "Nhập giá",
}: Props) {
  const [field, meta, helpers] = useField<number>(name);
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatInputPrice(field.value));

  useEffect(() => {
    if (!focused) {
      setText(formatInputPrice(field.value));
    }
  }, [field.value, focused]);

  return (
    <>
      <input
        type="text"
        inputMode="decimal"
        name={field.name}
        disabled={disabled}
        placeholder={placeholder}
        className={clsx("num w-full", className)}
        value={focused ? text : formatInputPrice(field.value)}
        onFocus={() => {
          setFocused(true);
          setText(
            field.value != null && !Number.isNaN(field.value)
              ? String(field.value).replace(".", ",")
              : ""
          );
        }}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          const parsed = parseInputPrice(v);
          if (parsed != null) {
            helpers.setValue(parsed);
          } else if (v.trim() === "") {
            helpers.setValue(0);
          }
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseInputPrice(text);
          const next =
            parsed != null ? roundInputPrice(parsed) : roundInputPrice(0);
          helpers.setValue(next);
          setText(formatInputPrice(next));
        }}
      />
      {meta.touched && meta.error ? (
        <div className="mt-1 text-sm text-kc-down">{meta.error}</div>
      ) : null}
    </>
  );
}
