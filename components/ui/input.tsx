"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

import { DatePicker } from "@/components/ui/date-picker"

// A time field: Safari draws an empty one with today's date and
// 12:30 in grey, read as a value (recette 23/10, CONC-001). `data-empty`
// lets app/globals.css hide that drawing until the field is focused.
const TIME_LIKE = new Set(["time", "datetime-local", "month", "week"])

function Input({
  className,
  type,
  onChange,
  ...props
}: React.ComponentProps<"input">) {
  // Every date field of the app: PDS OS's own calendar, not the browser's.
  if (type === "date")
    return <DatePicker className={className} onChange={onChange} {...props} />
  return <NativeInput className={className} type={type} onChange={onChange} {...props} />
}

function NativeInput({
  className,
  type,
  onChange,
  ...props
}: React.ComponentProps<"input">) {
  const timeLike = type !== undefined && TIME_LIKE.has(type)
  const [typed, setTyped] = React.useState<string | null>(null)
  const value =
    props.value !== undefined
      ? String(props.value ?? "")
      : (typed ?? String(props.defaultValue ?? ""))
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-empty={timeLike && value === "" ? "" : undefined}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        if (timeLike) setTyped(event.currentTarget.value)
        onChange?.(event)
      }}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-card px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-error aria-invalid:ring-3 aria-invalid:ring-error/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-error/50 dark:aria-invalid:ring-error/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
