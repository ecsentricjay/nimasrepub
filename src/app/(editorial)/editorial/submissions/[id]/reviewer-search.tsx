"use client";

import { useState, useEffect, useRef } from "react";
import { inviteReviewerAction } from "@/lib/editorial/actions";
import { SubmitButton } from "@/components/submit-button";

type Profile = {
  id: string;
  full_name: string;
  email: string | null;
  affiliation: string | null;
};

export function ReviewerSearch({ articleId }: { articleId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/reviewers/search?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data: Profile[] = await res.json();
          setResults(data);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <form action={inviteReviewerAction} className="mt-3 space-y-4">
      <input type="hidden" name="article_id" value={articleId} />
      <input
        type="hidden"
        name="reviewer_id"
        value={selected?.id ?? ""}
      />

      {/* Search box */}
      <div className="relative">
        <label className="text-sm font-medium text-foreground">
          Search by name or email
        </label>
        <input
          type="text"
          value={selected ? selected.full_name : query}
          onChange={(e) => {
            setSelected(null);
            setResults([]);
            setQuery(e.target.value);
          }}
          placeholder="Dr. Jane Smith or jane@example.com"
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />

        {/* Dropdown results */}
        {!selected && results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(r);
                    setResults([]);
                    setQuery("");
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <span className="font-medium">{r.full_name}</span>
                  {r.affiliation && (
                    <span className="text-muted-foreground">
                      {" "}
                      — {r.affiliation}
                    </span>
                  )}
                  {r.email && (
                    <span className="block text-xs text-muted-foreground">
                      {r.email}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {loading && (
          <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
        )}
        {!loading && query.length >= 2 && results.length === 0 && !selected && (
          <p className="mt-1 text-xs text-muted-foreground">
            No registered users found. The reviewer must have a NIMASREPUB
            account before they can be invited.
          </p>
        )}
      </div>

      {/* Selected reviewer confirmation */}
      {selected && (
        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-brand-navy">{selected.full_name}</p>
            {selected.affiliation && (
              <p className="text-xs text-muted-foreground">
                {selected.affiliation}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-xs text-red-500 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {/* Review deadline */}
      <div>
        <label className="text-sm font-medium text-foreground">
          Review deadline
          <span className="ml-1 text-muted-foreground font-normal">
            (optional)
          </span>
        </label>
        <input
          type="date"
          name="deadline"
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-blue"
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      <SubmitButton pendingText="Sending invitation...">
        Send invitation
      </SubmitButton>
    </form>
  );
}
