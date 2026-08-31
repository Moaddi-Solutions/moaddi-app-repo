"use client"

import * as React from "react"
import { Check, Minus } from "lucide-react"

/**
 * Hand-rolled on a native input, matching `switch.tsx` — this project styles
 * its own primitives rather than pulling in Radix (none of @radix-ui/react-
 * checkbox or react-switch is installed).
 *
 * The native input stays in the DOM, visually hidden but focusable, so keyboard
 * and screen-reader behaviour is the browser's rather than something
 * re-implemented with aria attributes.
 */
function Checkbox({
  className,
  checked,
  disabled,
  onCheckedChange,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  checked?: boolean | "indeterminate"
  onCheckedChange?: (checked: boolean) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isIndeterminate = checked === "indeterminate"

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

  return (
    <span className="relative inline-flex size-4 shrink-0 items-center justify-center">
      <input
        ref={inputRef}
        type="checkbox"
        data-slot="checkbox"
        checked={checked === true}
        disabled={disabled}
        onChange={(event) => {
          onChange?.(event)
          onCheckedChange?.(event.target.checked)
        }}
        className="peer absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-[4px] border border-input bg-background outline-none transition-colors checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40"
        {...props}
      />
      {/* Sits above the input, which covers the whole box — without the higher
          z-index the tick is painted underneath and never seen. */}
      <Check
        aria-hidden="true"
        className="pointer-events-none relative z-20 size-3 stroke-[3] text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100 peer-indeterminate:opacity-0"
      />
      <Minus
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 m-auto size-3 stroke-[3] text-primary-foreground opacity-0 transition-opacity peer-indeterminate:opacity-100"
      />
    </span>
  )
}

export { Checkbox }
