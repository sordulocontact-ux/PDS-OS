"use client";

import { useEffect, useState } from "react";

import {
  micDiagnosis,
  type CaptureError,
} from "@/components/calls/recorder-media";

/**
 * What already blocks the microphone, read without prompting (PROJ-BUG-01):
 * no input plugged in, or the permission blocked for the site. Kept up to
 * date when a device is plugged or the permission changes. Only the user's
 * click on « Commencer » ever asks the browser for the microphone.
 */
export function useMicDiagnosis(enabled: boolean): CaptureError | null {
  const [diagnosis, setDiagnosis] = useState<CaptureError | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined") return;
    let live = true;
    const check = () =>
      void micDiagnosis().then((found) => live && setDiagnosis(found));
    check();

    let permission: PermissionStatus | null = null;
    void navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((status) => {
        permission = status;
        status.addEventListener("change", check);
      })
      .catch(() => undefined);
    navigator.mediaDevices?.addEventListener("devicechange", check);
    return () => {
      live = false;
      permission?.removeEventListener("change", check);
      navigator.mediaDevices?.removeEventListener("devicechange", check);
    };
  }, [enabled]);

  return enabled ? diagnosis : null;
}
