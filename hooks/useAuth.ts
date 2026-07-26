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

  useEffect(() => {
    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
  }, []);

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
    logout,
  };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Si è verificato un errore.";
}
