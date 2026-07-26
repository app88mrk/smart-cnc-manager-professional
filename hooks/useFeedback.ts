"use client";

import { useCallback, useEffect, useState } from "react";

export type Feedback = {
  type: "success" | "error";
  message: string;
};

type UseFeedbackOptions = {
  successDuration?: number;
};

export default function useFeedback({
  successDuration = 4500,
}: UseFeedbackOptions = {}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const showError = useCallback((message: string) => {
    setFeedback({ type: "error", message });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setFeedback({ type: "success", message });
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  useEffect(() => {
    if (
      feedback?.type !== "success" ||
      successDuration <= 0
    ) {
      return;
    }

    const timeout = window.setTimeout(
      clearFeedback,
      successDuration
    );

    return () => window.clearTimeout(timeout);
  }, [clearFeedback, feedback, successDuration]);

  return {
    feedback,
    showError,
    showSuccess,
    clearFeedback,
  };
}
