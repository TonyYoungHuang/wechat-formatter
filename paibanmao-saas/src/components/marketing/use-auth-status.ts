"use client";

import { useEffect, useState } from "react";

type AuthStatus = {
  checked: boolean;
  signedIn: boolean;
};

export function useAuthStatus(): AuthStatus {
  const [status, setStatus] = useState<AuthStatus>({ checked: false, signedIn: false });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) {
          setStatus({ checked: true, signedIn: Boolean(payload.user) });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ checked: true, signedIn: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
