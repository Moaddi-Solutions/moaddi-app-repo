import { cn } from "@/../lib/utils";

const SimpleLink = ({ children, className, ...rest }) => {
  return (
    <div
      className={cn(
        "relative flex flex-col hover:[&_span]:min-h-0.5",
        className,
      )}
      {...rest}
    >
      {children}
      <span className="bg-primary-600 absolute bottom-0 -mb-2 min-h-0 w-full transition-all" />
    </div>
  );
};

export default SimpleLink;
