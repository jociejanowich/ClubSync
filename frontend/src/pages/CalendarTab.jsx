import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid"; // month grid view
import multiMonthPlugin from "@fullcalendar/multimonth"; // 12 month year view
import interactionPlugin from "@fullcalendar/interaction"; // lets officers click a day
import { api } from "../api";

const CATEGORY_LABELS = {
  general_body: "General Body",
  officer_meeting: "Officer Meeting",
  committee: "Committee",
  social: "Social",
  fundraiser: "Fundraiser",
  community_service: "Community Service",
  other: "Other",
};

// Same colors as Event.CATEGORY_COLORS in backend/clubs/models.py.
// Used for the legend so every category shows even if it has no events yet.
// The colors on the calendar itself come from the API (ev.color).
const CATEGORY_COLORS = {
  general_body: "#2E5C8A",
  officer_meeting: "#8A2E5C",
  committee: "#2E8A5C",
  social: "#D98E04",
  fundraiser: "#8A5C2E",
  community_service: "#2E8A8A",
  other: "#6B6B6B",
};

// Picks white or dark text for a background color. Uses white unless the
// background is too light for white to be readable (WCAG contrast under 3:1,
// the minimum for bold text). Keeps working if the category colors change.
function readableTextColor(hex) {
  if (!hex) return "#ffffff";
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  return contrastWithWhite >= 3 ? "#ffffff" : "#1a1a1a";
}

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "general_body",
  location: "",
  start_time: "",
  end_time: "",
};

export default function CalendarTab({ clubId, isOfficer, currentUserId }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setEvents(await api.listEvents(clubId));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.createEvent({ ...form, club: Number(clubId) });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId) => {
    try {
      await api.deleteEvent(eventId);
      setSelectedEventId(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  // Officers can click a day, or click and drag across several days,
  // to start a new event over those dates. No set length, so events
  // can span multiple days. Times start at the beginning of the first
  // day and the end of the last day, and can be changed in the form.
  const handleSelect = (info) => {
    if (!isOfficer) return;
    const startDay = info.startStr.slice(0, 10); // "2026-11-20"
    // FullCalendar's end date is the day AFTER the selection, so step back one day
    const last = new Date(info.end);
    last.setDate(last.getDate() - 1);
    const endDay = [
      last.getFullYear(),
      String(last.getMonth() + 1).padStart(2, "0"),
      String(last.getDate()).padStart(2, "0"),
    ].join("-");
    setForm({ ...EMPTY_FORM, start_time: `${startDay}T00:00`, end_time: `${endDay}T23:59` });
    setShowForm(true);
    info.view.calendar.unselect();
  };

  // Turn our API events into the shape FullCalendar expects
  const calendarEvents = events.map((ev) => ({
    id: String(ev.id),
    title: ev.title,
    start: ev.start_time,
    end: ev.end_time,
    backgroundColor: ev.color,
    borderColor: ev.color,
    textColor: readableTextColor(ev.color), // white on dark colors, dark on light ones
  }));

  const selectedEvent = events.find((ev) => ev.id === selectedEventId);

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="page-header">
        <h3>Events</h3>
        {isOfficer && (
          <button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New Event"}
          </button>
        )}
      </div>

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label>
              Category
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              Start
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </label>
            <label>
              End
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </label>
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Event"}
          </button>
        </form>
      )}

      {/* Color legend so people know what each color means */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", margin: "12px 0" }}>
        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
          <span key={value} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: CATEGORY_COLORS[value],
                display: "inline-block",
              }}
            />
            {label}
          </span>
        ))}
      </div>

      <div className="card">
        <FullCalendar
          plugins={[dayGridPlugin, multiMonthPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,multiMonthYear",
          }}
          buttonText={{ today: "Today", month: "Month", year: "Year" }}
          views={{ multiMonthYear: { multiMonthMaxColumns: 3 } }} // 12 months as a 4 x 3 grid
          events={calendarEvents}
          eventClick={(info) => setSelectedEventId(Number(info.event.id))}
          selectable={isOfficer} // click or drag across days to add an event
          select={handleSelect}
          dayMaxEvents={3} // shows "+2 more" instead of overflowing a day
          displayEventTime={false} // hide "7a" etc., times show when you click the event
          eventDisplay="block" // solid colored bars instead of small dots
          height="auto"
        />
      </div>

      {events.length === 0 && (
        <p className="muted">
          No events scheduled yet.{isOfficer && " Click a day, drag across days, or use + New Event to add one."}
        </p>
      )}

      {/* Details and attendance for the event that was clicked */}
      {selectedEvent && (
        <div className="card event-item" style={{ borderLeftColor: selectedEvent.color }}>
          <div className="event-item-header">
            <div>
              <strong>{selectedEvent.title}</strong>
              <span
                className="badge"
                style={{
                  backgroundColor: selectedEvent.color,
                  color: readableTextColor(selectedEvent.color),
                }}
              >
                {CATEGORY_LABELS[selectedEvent.category] || selectedEvent.category}
              </span>
            </div>
            <span className="muted">
              {new Date(selectedEvent.start_time).toLocaleString()} @{" "}
              {selectedEvent.location || "TBD"}
            </span>
            <button className="link-button" onClick={() => setSelectedEventId(null)}>
              Close
            </button>
          </div>
          <EventAttendancePanel
            key={selectedEvent.id}
            event={selectedEvent}
            isOfficer={isOfficer}
            currentUserId={currentUserId}
            onDelete={isOfficer ? () => handleDelete(selectedEvent.id) : null}
          />
        </div>
      )}
    </div>
  );
}

function EventAttendancePanel({ event, isOfficer, currentUserId, onDelete }) {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setRecords(await api.getAttendance(event.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const myRecord = records.find((r) => r.member.id === currentUserId);

  const handleCheckIn = async () => {
    try {
      await api.markAttendance(event.id, {});
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMark = async (memberId, status) => {
    try {
      await api.markAttendance(event.id, { member_id: memberId, status, method: "manual" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="attendance-panel">
      {error && <div className="error-banner">{error}</div>}
      {event.description && <p>{event.description}</p>}

      {!isOfficer && (
        <button onClick={handleCheckIn} disabled={myRecord?.status === "present"}>
          {myRecord?.status === "present" ? "Checked In ✓" : "Check In"}
        </button>
      )}

      {loading ? (
        <p className="muted">Loading attendance...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Status</th>
              <th>Method</th>
              {isOfficer && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={isOfficer ? 4 : 3} className="muted">
                  No attendance recorded yet.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.member.username}</td>
                <td>{r.status}</td>
                <td>{r.method}</td>
                {isOfficer && (
                  <td>
                    <button className="link-button" onClick={() => handleMark(r.member.id, "present")}>
                      Present
                    </button>
                    <button className="link-button" onClick={() => handleMark(r.member.id, "absent")}>
                      Absent
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {onDelete && (
        <button className="link-button danger" onClick={onDelete}>
          Delete This Event
        </button>
      )}
    </div>
  );
}
