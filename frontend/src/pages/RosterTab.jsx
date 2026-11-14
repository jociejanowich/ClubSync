import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const ROLE_LABELS = { member: "General Member", officer: "Officer" };

export default function RosterTab({ clubId, isOfficer, currentUserId }) {
  const [roster, setRoster] = useState([]);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false); // the Add Member popup
  const [submitting, setSubmitting] = useState(false);
  // The roster change waiting for a second confirmation (null when nothing is pending)
  const [pending, setPending] = useState(null);

  const load = async () => {
    try {
      setRoster(await api.getRoster(clubId));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Runs the confirmed change, then reloads the roster
  const runPending = async () => {
    if (!pending) return;
    setSubmitting(true);
    setError("");
    try {
      await pending.run();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setPending(null);
    }
  };

  // Adding someone from the Add Member popup. General members are added
  // right away. Adding someone as an officer asks for confirmation first.
  const handleAdd = (person) => {
    const name = `${person.first_name} ${person.last_name}`.trim() || person.email;
    const add = async () => {
      await api.addRosterMember(clubId, person);
      setShowAdd(false);
    };
    if (person.role !== "officer") {
      setSubmitting(true);
      setError("");
      return add()
        .then(load)
        .catch((err) => setError(err.message))
        .finally(() => setSubmitting(false));
    }
    setPending({
      title: "Add as an officer?",
      message: `${name} will be added as an Officer and will be able to manage the roster, events, and attendance.`,
      confirmLabel: "Add as officer",
      run: add,
    });
  };

  // Changing a role: confirm first. The dropdown stays on the old role until
  // the change is confirmed, so cancelling leaves it as it was.
  const handleRoleChange = (member, newRole) => {
    if (newRole === member.role) return;
    const isSelf = member.user.id === currentUserId;
    const promoting = newRole === "officer";
    const name = member.user.username;
    let title, message, confirmLabel;
    if (promoting) {
      title = `Promote ${name} to Officer?`;
      message = `${name} will be able to manage the roster, events, and attendance for this club.`;
      confirmLabel = "Promote";
    } else if (isSelf) {
      title = "Remove your own officer access?";
      message =
        "You'll become a General Member and won't be able to manage the roster or change this back yourself. Another officer would have to make you an officer again.";
      confirmLabel = "Remove my access";
    } else {
      title = `Demote ${name} to General Member?`;
      message = `${name} will lose officer access and won't be able to manage the roster, events, or attendance.`;
      confirmLabel = "Demote";
    }
    setPending({
      title,
      message,
      confirmLabel,
      danger: !promoting, // demotions get the red button
      run: () => api.updateRosterMember(clubId, member.id, { role: newRole }),
    });
  };

  // Removing someone: confirm, with a stronger warning when removing yourself
  const handleRemove = (member) => {
    const isSelf = member.user.id === currentUserId;
    const name = member.user.username;
    const isOfficerRow = member.role === "officer";
    let title, message, confirmLabel;
    if (isSelf) {
      title = "Leave this club?";
      message = "You'll be removed from this club's roster and lose access to it.";
      confirmLabel = "Leave club";
    } else if (isOfficerRow) {
      title = `Remove officer ${name}?`;
      message = `${name} is an Officer. Removing them takes them off the roster and removes their officer access.`;
      confirmLabel = "Remove officer";
    } else {
      title = `Remove ${name} from the roster?`;
      message = `${name} will be taken off the roster and lose access to this club.`;
      confirmLabel = "Remove";
    }
    setPending({
      title,
      message,
      confirmLabel,
      danger: true,
      run: () => api.removeRosterMember(clubId, member.id),
    });
  };

  return (
    <div>
      {error && !showAdd && <div className="error-banner">{error}</div>}

      {isOfficer && (
        <div className="page-header">
          <h3>Roster</h3>
          <button onClick={() => setShowAdd(true)}>+ Add Member</button>
        </div>
      )}

      {showAdd && (
        <AddMemberDialog
          busy={submitting}
          error={error}
          onSubmit={handleAdd}
          onCancel={() => {
            setShowAdd(false);
            setError("");
          }}
        />
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            <th>Role</th>
            <th>Joined</th>
            {isOfficer && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {roster.map((m) => (
            <tr key={m.id}>
              <td>
                {m.user.first_name || m.user.last_name
                  ? `${m.user.first_name} ${m.user.last_name}`.trim()
                  : "—"}
              </td>
              <td>{m.user.username}</td>
              <td>
                {isOfficer ? (
                  <select value={m.role} onChange={(e) => handleRoleChange(m, e.target.value)}>
                    <option value="member">General Member</option>
                    <option value="officer">Officer</option>
                  </select>
                ) : (
                  <span className={`role-tag role-${m.role}`}>{m.role}</span>
                )}
              </td>
              <td>{new Date(m.date_joined).toLocaleDateString()}</td>
              {isOfficer && (
                <td>
                  <button className="link-button danger" onClick={() => handleRemove(m)}>
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {pending && (
        <ConfirmDialog
          title={pending.title}
          message={pending.message}
          confirmLabel={pending.confirmLabel}
          danger={pending.danger}
          busy={submitting}
          onConfirm={runPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

// Popup form for adding someone to the roster
function AddMemberDialog({ busy, error, onSubmit, onCancel }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", role: "member" });
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      role: form.role,
    });
  };

  return (
    <div onClick={onCancel} style={overlayStyle}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-member-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="card"
        style={{ maxWidth: 460, width: "100%", margin: 0 }}
      >
        <h3 id="add-member-title" style={{ marginTop: 0 }}>
          Add Member
        </h3>
        {error && <div className="error-banner">{error}</div>}
        <div className="field-row">
          <label>
            First Name
            <input value={form.first_name} onChange={set("first_name")} required autoFocus />
          </label>
          <label>
            Last Name
            <input value={form.last_name} onChange={set("last_name")} required />
          </label>
        </div>
        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="Email used for attendance"
            required
          />
        </label>
        <label>
          Role
          <select value={form.role} onChange={set("role")}>
            <option value="member">General Member</option>
            <option value="officer">Officer</option>
          </select>
        </label>
        <p className="muted" style={{ fontSize: 13 }}>
          If they don't have a ClubSync account yet, they'll be added to the roster and can
          sign up later with this email to claim it.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button type="button" onClick={onCancel} disabled={busy} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button type="submit" disabled={busy}>
            {busy ? "Adding..." : "Add to Roster"}
          </button>
        </div>
      </form>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 1000,
};

const secondaryButtonStyle = {
  background: "transparent",
  color: "#3a5ba0",
  border: "1px solid #c9d3e6",
};

// Simple confirm popup. Escape or clicking outside cancels.
function ConfirmDialog({ title, message, confirmLabel, danger, busy, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    // Focus Cancel by default so pressing Enter by accident doesn't confirm
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      onClick={onCancel}
      style={{ ...overlayStyle, zIndex: 1100 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: 420, width: "100%", margin: 0 }}
      >
        <h3 id="confirm-title" style={{ marginTop: 0 }}>
          {title}
        </h3>
        <p>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={danger ? { background: "#b42318" } : undefined}
          >
            {busy ? "Saving..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
