import { useEffect, useState } from "react";
import { api } from "../api";

export default function RosterTab({ clubId, isOfficer }) {
  const [roster, setRoster] = useState([]);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("member");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setRoster(await api.getRoster(clubId));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, [clubId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.addRosterMember(clubId, { username, role });
      setUsername("");
      setRole("member");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (membershipId, newRole) => {
    try {
      await api.updateRosterMember(clubId, membershipId, { role: newRole });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemove = async (membershipId) => {
    try {
      await api.removeRosterMember(clubId, membershipId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      {isOfficer && (
        <form className="inline-form" onSubmit={handleAdd}>
          <input
            placeholder="Username to add"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">General Member</option>
            <option value="officer">Officer</option>
          </select>
          <button type="submit" disabled={submitting}>
            {submitting ? "Adding..." : "Add to Roster"}
          </button>
        </form>
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
                  <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}>
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
                  <button className="link-button danger" onClick={() => handleRemove(m.id)}>
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
