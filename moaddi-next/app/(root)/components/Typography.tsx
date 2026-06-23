import { cva } from "class-variance-authority";
import React from "react";

/* 0.75rem  (12px)  "text-xs"   */
/* 0.875rem (14px)  "text-sm"   */
/* 1rem     (16px)  "text-base" */
/* 1.125rem (18px)  "text-lg"   */
/* 1.25rem  (20px)  "text-xl"   */
/* 1.5rem   (24px)  "text-2xl"  */
/* 1.875rem (30px)  "text-3xl"  */
/* 2.25rem  (36px)  "text-4xl"  */
/* 3rem     (48px)  "text-5xl"  */
/* 3.75rem  (60px)  "text-6xl"  */
/* 4.5rem   (72px)  "text-7xl"  */
/* 6rem     (96px)  "text-8xl"  */
/* 8rem     (128px) "text-9xl"  */

const typographyClasses = cva("", {
  variants: {
    variant: {
      h1: "text-8xl md:text-9xl",
      h2: "text-6xl md:text-7xl",
      h3: "text-5xl md:text-6xl",
      h4: "text-4xl md:text-5xl",
      h5: "text-3xl md:text-4xl",
      h6: "text-xl  md:text-2xl",
      body1: "text-base",
      body2: "text-sm",
      caption: "text-xs",
    },
  },
  defaultVariants: {
    variant: "body1",
  },
});

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType | string;
  variant?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "body1"
    | "body2"
    | "caption";
  className?: string;
  children: React.ReactNode;
}

const Typography: React.FC<TypographyProps> = ({
  as: Component,
  variant,
  className,
  children,
  ...props
}) => {
  // Default to 'p' if no 'as' prop is provided
  if (!Component)
    switch (variant) {
      case "h1":
        Component = "h1";
        break;
      case "h2":
        Component = "h2";
        break;
      case "h3":
        Component = "h3";
        break;
      case "h4":
        Component = "h4";
        break;
      case "h5":
        Component = "h5";
        break;
      case "h6":
        Component = "h6";
        break;
      case "body1":
        Component = "p";
        break;
      case "body2":
        Component = "p";
        break;
      case "caption":
        Component = "span";
        break;
      default:
        Component = "p";
        break;
    }

  return (
    <Component className={typographyClasses({ variant, className })} {...props}>
      {children}
    </Component>
  );
};

export default Typography;
