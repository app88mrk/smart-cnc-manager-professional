"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "@/lib/firebase";

type AuthScreenProps = {
  errorMessage: (error: unknown) => string;
  accessError?: string;
};

export default function AuthScreen({
  errorMessage,
  accessError = "",
}: AuthScreenProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    setBusy(true);
    setError("");

    try {
      const email = String(formData.get("email"));
      const password = String(formData.get("password"));

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authPage">
      <form className="authCard" onSubmit={submit}>
        <div className="brand authBrand">
          <span>SC</span>

          <div>
            <b>Smart CNC Manager</b>
            <small>Professional Edition</small>
          </div>
        </div>

        <h1>Accesso personale</h1>

        <p>
          Area privata riservata all&apos;utente autorizzato.
        </p>

        {(error || accessError) && (
          <div className="authError">
            {error || accessError}
          </div>
        )}

        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
          />
        </label>

        <button className="primary" disabled={busy}>
          {busy ? "Attendere…" : "Accedi"}
        </button>
      </form>
    </div>
  );
}
