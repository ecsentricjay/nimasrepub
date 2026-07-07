"use client";

import { useState, useTransition } from "react";

export function InvitationResponseButtons({
  invitationId,
}: {
  invitationId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function respond(response: "accepted" | "declined") {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("invitation_id", invitationId);
      formData.set("response", response);

      try {
        const result = await fetch("/api/reviewer/invitations", {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        });

        if (result.redirected) {
          window.location.assign(result.url);
          return;
        }

        if (!result.ok) {
          setError("Could not save your response. Please refresh and try again.");
          return;
        }

        window.location.reload();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond("accepted")}
          className="rounded-sm bg-brand-navy px-4 py-2 text-sm font-bold text-white hover:bg-brand-blue disabled:opacity-70"
        >
          {isPending ? "Saving..." : "Accept"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond("declined")}
          className="rounded-sm border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:border-red-300 hover:text-red-600 disabled:opacity-70"
        >
          Decline
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
