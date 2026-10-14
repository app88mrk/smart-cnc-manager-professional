"use client";

import { useCallback, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import {
  auth,
  firebaseConfigured,
} from "@/lib/firebase";
import { isAllowedUser } from "@/lib/access";

type UseAuthOptions = {
  onError: (message: string) => void;
};

export default function useAuth({
  onError,
}: UseAuthOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(
    !firebaseConfigured
  );
  const [accessError, setAccessError] = useState("");

  useEffect(() => {
    const authInstance = auth;

    if (!authInstance) {
      return;
    }

    return onAuthStateChanged(
      authInstance,
      (currentUser) => {
        if (
          currentUser &&
          !isAllowedUser(currentUser.uid)
        ) {
          setUser(null);
          setAuthReady(true);
          setAccessError(
            "Questo account non è autorizzato."
          );

          void signOut(authInstance).catch((error) => {
            onError(errorMessage(error));
          });

          return;
        }

        if (currentUser) {
          setAccessError("");
        }

        setUser(currentUser);
        setAuthReady(true);
      }
    );
  }, [onError]);

  const logout = useCallback(async () => {
    if (!auth) {
      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      onError(errorMessage(error));
      throw error;
    }
  }, [onError]);

  return {
    user,
    authReady,
    accessError,
    logout,
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore.";
}
