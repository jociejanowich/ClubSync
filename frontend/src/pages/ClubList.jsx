import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const CATEGORY_LABELS = {
  academic: "Academic/Professional",
  sports: "Sports/Recreation",
  service: "Community Service",
  cultural: "Cultural/Identity",
  arts: "Arts/Performance",
  other: "Other",
};

export default function ClubList() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "academic" });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setClubs(await api.listClubs());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.createClub(form);
      setForm({ name: "", description: "", category: "academic" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="muted">Loading clubs...</p>;

  return (
    <div>
      <div className="page-header">
        <h2>Your Clubs</h2>
        <button onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New Club"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={handleCreate}>
          <label>
            Club name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create Club"}
          </button>
        </form>
      )}

      {clubs.length === 0 ? (
        <p className="muted">
          You're not a member of any clubs yet. Create one, or ask an officer to add you to
          their roster.
        </p>
      ) : (
        <div className="club-grid">
          {clubs.map((club) => (
            <Link to={`/clubs/${club.id}`} key={club.id} className="club-card">
              <h3>{club.name}</h3>
              <span className="badge">{CATEGORY_LABELS[club.category] || club.category}</span>
              <p className="muted">{club.description || "No description yet."}</p>
              <div className="club-card-footer">
                <span>{club.member_count} member{club.member_count === 1 ? "" : "s"}</span>
                <span className={`role-tag role-${club.my_role}`}>{club.my_role}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
