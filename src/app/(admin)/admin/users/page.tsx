import type { Metadata } from "next";
import { getAllUsers } from "@/lib/admin/queries";
import {
  grantRoleAction,
  revokeRoleAction,
  toggleUserActiveAction,
} from "@/lib/admin/actions";
import { SubmitButton } from "@/components/submit-button";

export const metadata: Metadata = { title: "Users & Roles" };

const ALL_ROLES = [
  "admin",
  "editor_in_chief",
  "section_editor",
  "reviewer",
  "author",
] as const;

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor_in_chief: "Editor-in-Chief",
  section_editor: "Section Editor",
  reviewer: "Reviewer",
  author: "Author",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border border-red-200",
  editor_in_chief: "bg-purple-50 text-purple-700 border border-purple-200",
  section_editor: "bg-blue-50 text-blue-700 border border-blue-200",
  reviewer: "bg-amber-50 text-amber-700 border border-amber-200",
  author: "bg-muted text-muted-foreground",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    role_updated?: string;
    updated?: string;
  }>;
}) {
  const { error, role_updated, updated } = await searchParams;
  const users = await getAllUsers();

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-3xl font-semibold text-brand-navy">
        Users & roles
      </h1>
      <p className="mt-1 text-muted-foreground">
        {users.length} registered user{users.length === 1 ? "" : "s"}
      </p>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {(role_updated || updated) && (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Updated successfully.
        </p>
      )}

      <div className="mt-8 space-y-4">
        {users.map((u) => {
          const userRoleNames = u.roles.map((r) => r.role);
          return (
            <div
              key={u.id}
              className={`rounded-md border border-border p-5 ${
                !u.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-navy">
                    {u.full_name}
                    {!u.is_active && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Deactivated
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.email}
                    {u.affiliation && ` · ${u.affiliation}`}
                    {` · Joined ${formatDate(u.created_at)}`}
                  </p>
                </div>

                {/* Deactivate toggle */}
                <form action={toggleUserActiveAction}>
                  <input type="hidden" name="user_id" value={u.id} />
                  <input
                    type="hidden"
                    name="is_active"
                    value={String(u.is_active)}
                  />
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground hover:text-red-600 hover:underline"
                  >
                    {u.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </div>

              {/* Current roles */}
              <div className="mt-3 flex flex-wrap gap-2">
                {userRoleNames.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No roles assigned
                  </span>
                ) : (
                  userRoleNames.map((role) => (
                    <form
                      key={role}
                      action={revokeRoleAction}
                      className="inline-flex"
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <input type="hidden" name="role" value={role} />
                      <button
                        type="submit"
                        title={`Revoke ${ROLE_LABELS[role]}`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          ROLE_COLORS[role] ?? "bg-muted text-muted-foreground"
                        } hover:opacity-70`}
                      >
                        {ROLE_LABELS[role] ?? role}
                        <span className="text-[10px] opacity-60">✕</span>
                      </button>
                    </form>
                  ))
                )}
              </div>

              {/* Grant role */}
              <form action={grantRoleAction} className="mt-3 flex gap-2">
                <input type="hidden" name="user_id" value={u.id} />
                <select
                  name="role"
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand-blue"
                >
                  {ALL_ROLES.filter((r) => !userRoleNames.includes(r)).map(
                    (r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    )
                  )}
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-brand-blue px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue hover:text-white"
                >
                  Grant role
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
