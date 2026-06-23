import { cn } from "@/../lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const containerVariants = cva("container mx-auto", {
  variants: {
    variant: {
      constrained: "max-w-7xl px-4 sm:px-6 lg:px-8",
      breakpoint: "px-4 sm:px-6 lg:px-8",
    },
  },
  defaultVariants: {
    variant: "constrained",
  },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: React.ElementType | string;
}

const Container: React.FC<ContainerProps> = ({
  as: Component = "div",
  className,
  children,
  variant,
  ...props
}) => (
  <Component
    className={cn(containerVariants({ variant }), className)}
    {...props}
  >
    {children}
  </Component>
);

export { Container, containerVariants };
