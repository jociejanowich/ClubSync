import { useEffect, useState } from "react";
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

export default function CalendarTab({ clubId, isOfficer, currentUserId }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "general_body",
    location: "",
    start_time: "",
    end_time: "",
  });
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
  }, [clubId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.createEvent({ ...form, club: Number(clubId) });
      setForm({
        title: "",
        description: "",
        category: "general_body",
        location: "",
        start_time: "",
        end_time: "",
      });
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
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      {isOfficer && (
        <div className="page-header">
          <h3>Events</h3>
          <button onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "+ New Event"}
          </button>
        </div>
      )}

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

      {events.length === 0 ? (
        <p className="muted">No events scheduled yet.</p>
      ) : (
        <ul className="event-list">
          {events.map((ev) => (
            <li key={ev.id} className="event-item" style={{ borderLeftColor: ev.color }}>
              <div className="event-item-header" onClick={() => setExpandedEvent(
                expandedEvent === ev.id ? null : ev.id
              )}>
                <div>
                  <strong>{ev.title}</strong>
                  <span className="badge" style={{ backgroundColor: ev.color }}>
                    {CATEGORY_LABELS[ev.category] || ev.category}
                  </span>
                </div>
                <span className="muted">
                  {new Date(ev.start_time).toLocaleString()} @ {ev.location || "TBD"}
                </span>
              </div>

              {expandedEvent === ev.id && (
                <EventAttendancePanel
                  event={ev}
                  isOfficer={isOfficer}
                  currentUserId={currentUserId}
                  onDelete={isOfficer ? () => handleDelete(ev.id) : null}
                />
              )}
            </li>
          ))}
        </ul>
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
