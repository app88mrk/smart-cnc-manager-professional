"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";

interface FeedbackBannerProps {
  type: "success" | "error";
  message: string;
  close: () => void;
}

export default function FeedbackBanner({
  type,
  message,
  close,
}: FeedbackBannerProps) {
  const Icon = type === "success" ? CheckCircle2 : CircleAlert;

  return (
    <div
      className={`alert ${type}`}
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span>
        <Icon size={18} />
        {message}
      </span>
      <button onClick={close} aria-label="Chiudi messaggio">
        <X size={16} />
      </button>
    </div>
  );
}
