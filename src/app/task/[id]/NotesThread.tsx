import type { Note, Parent } from "@/lib/database.types";

export function NotesThread({
  notes,
  parent,
  parentNames,
}: {
  notes: Note[];
  parent: Parent;
  parentNames: Record<string, string>;
}) {
  if (notes.length === 0) {
    return (
      <p className="flex-1 px-5 py-6 text-center text-body text-text-secondary">
        No notes yet — leave one for your partner.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
      {notes.map((note) => {
        const mine = note.parent_id === parent.id;
        const name = parentNames[note.parent_id] ?? "Partner";
        const time = new Date(note.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

        return (
          <div key={note.id} className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
            <div className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-chip text-[10px] font-semibold ${
                  mine ? "bg-chip-me-bg text-chip-me-text" : "bg-chip-them-bg text-chip-them-text"
                }`}
              >
                {name.charAt(0).toUpperCase()}
              </span>
              <span className="text-meta text-text-meta">
                {mine ? "You" : name} · {time}
              </span>
            </div>
            <div
              className={`max-w-[85%] rounded-card border px-3.5 py-2.5 text-body text-text-primary ${
                mine ? "border-[1.5px] border-brand bg-surface" : "border-border bg-surface"
              }`}
            >
              {note.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
