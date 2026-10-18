"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { IconCircleInfo, IconLoader, IconTriangleWarning } from "nucleo-sharp-essential";
import { IconCircleCheck, IconCircleXmark } from "@/components/icons";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <IconCircleCheck className="size-4" />
        ),
        info: (
          <IconCircleInfo className="size-4" />
        ),
        warning: (
          <IconTriangleWarning className="size-4" />
        ),
        error: (
          <IconCircleXmark className="size-4" />
        ),
        loading: (
          <IconLoader className="size-4 animate-spin" />
        ),
      }}
      // The proto's toast (docs/DESIGN.md § 4, C0): ink background, light
      // text, no border, radius 12, 15 px. Sonner's own sheet is not in a
      // layer, so the sizes need Tailwind's important flag to win.
      style={
        {
          "--normal-bg": "var(--surface-inverse)",
          "--normal-text": "var(--control-primary-fg)",
          "--normal-border": "transparent",
          "--border-radius": "var(--radius-2xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !gap-2.5 !px-4 !py-3 !text-[length:var(--type-body-sm)] !leading-[var(--type-body-sm-lh)] !font-medium !shadow-elevation-card",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
