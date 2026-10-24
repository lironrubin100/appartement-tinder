import { Input } from "@/components/ui";
import type { EditDraftRoom } from "@/lib/listings/edit-draft-fields";
import type { Locale } from "@/lib/listings/text";
/** Controlled presentation; callers own snapshots and persistence. */
export function EditListingRooms({
  rooms,
  locale,
  onChange,
}: {
  rooms: readonly EditDraftRoom[];
  locale: Locale;
  onChange: (rooms: readonly EditDraftRoom[]) => void;
}) {
  const en = locale === "en";
  const change = (
    id: string,
    patch: Partial<
      Pick<EditDraftRoom, "label" | "monthlyPrice" | "availableFrom">
    >,
  ) =>
    onChange(
      rooms.map((room) => (room.id === id ? { ...room, ...patch } : room)),
    );
  return (
    <fieldset className="space-y-4 rounded-shutaf-md border border-card-border p-4">
      <legend className="text-sm font-medium text-ink">
        {en ? "Existing rooms" : "חדרים קיימים"}
      </legend>
      <p className="text-sm text-muted-text">
        {en
          ? "Room availability is kept unchanged while editing this draft."
          : "זמינות החדרים נשארת ללא שינוי בעריכת הטיוטה."}
      </p>
      {!rooms.length && (
        <p className="text-sm text-muted-text">
          {en
            ? "No room records on this listing."
            : "אין רשומות חדרים בדירה הזו."}
        </p>
      )}
      {rooms.map((room, index) => (
        <section
          key={room.id}
          data-testid="edit-room"
          data-room-id={room.id}
          className="min-w-0 space-y-3 rounded-xl border border-card-border p-3"
        >
          <p className="font-medium text-ink">
            {en ? "Room" : "חדר"} {index + 1} ·{" "}
            {room.isAvailable
              ? en
                ? "Available"
                : "פנוי"
              : en
                ? "Unavailable"
                : "לא פנוי"}
          </p>
          <Input
            label={(en ? "Room label " : "שם חדר ") + (index + 1)}
            value={room.label ?? ""}
            maxLength={80}
            onChange={(event) => change(room.id, { label: event.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={
                (en ? "Monthly room price " : "מחיר חודשי לחדר ") +
                (index + 1) +
                " (₪)"
              }
              value={room.monthlyPrice}
              inputMode="numeric"
              maxLength={32}
              onChange={(event) =>
                change(room.id, { monthlyPrice: event.target.value })
              }
            />
            <Input
              label={
                (en ? "Room available from " : "תאריך כניסה לחדר ") +
                (index + 1)
              }
              value={room.availableFrom}
              maxLength={32}
              placeholder="YYYY-MM-DD"
              onChange={(event) =>
                change(room.id, { availableFrom: event.target.value })
              }
            />
          </div>
        </section>
      ))}
    </fieldset>
  );
}
