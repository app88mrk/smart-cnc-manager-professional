"use client";

import { FormEvent, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthScreenProps = {
  errorMessage: (error: unknown) => string;
};

export default function AuthScreen({ errorMessage }: AuthScreenProps) {
  const [register, setRegister] = useState(false);
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

      if (register) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setError(errorMessage(error));
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

        <h1>{register ? "Crea account" : "Accesso personale"}</h1>

        <p>I dati e i file saranno protetti nel tuo spazio Firebase.</p>

        {error && <div className="authError">{error}</div>}

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
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>

        <button className="primary" disabled={busy}>
          {busy
            ? "Attendere…"
            : register
              ? "Crea account"
              : "Accedi"}
        </button>

        <button
          type="button"
          className="linkButton"
          onClick={() => setRegister(!register)}
        >
          {register
            ? "Hai già un account? Accedi"
            : "Primo accesso? Crea account"}
        </button>
      </form>
    </div>
  );
}