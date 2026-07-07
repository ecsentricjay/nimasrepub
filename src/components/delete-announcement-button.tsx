"use client";

export function DeleteAnnouncementButton() {
  return (
    <button
      type="submit"
      className="text-xs text-red-500 hover:underline"
      onClick={(e) => {
        if (!confirm("Delete this announcement? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      Delete
    </button>
  );
}
