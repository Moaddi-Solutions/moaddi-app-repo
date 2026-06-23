import { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
}: ButtonProps) {
  const baseStyles =
    "rounded-2xl transition-all duration-200 active:scale-95 font-medium";

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-[#2cb4cc] to-[#7287e2] text-white shadow-lg shadow-[#7287e2]/20",
    secondary: "bg-gray-100 text-gray-800 border border-gray-200",
    ghost: "bg-transparent text-gray-700",
    destructive:
      "bg-gradient-to-r from-[#8e2b2b] to-[#5b4e04] text-white shadow-lg shadow-[#7287e2]/20",
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </button>
  );
}
