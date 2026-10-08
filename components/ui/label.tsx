"use client"

import * as React from "react"
import { cn } from "cn"

import { RequiredMark } from "@/components/ui/required-mark"

// `required`: the « * » of a required field (docs/DESIGN.md § 4); the
// control itself carries `required` for screen readers.
function Label({
  className,
  required = false,
  children,
  ...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {required ? (
        <span>
          {children}
          <RequiredMark />
        </span>
      ) : (
        children
      )}
    </label>
  )
}

export { Label }
