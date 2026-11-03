import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>ClubSync</h1>
        <p className="muted">
          Create an account (this simulates university sign-in for the prototype)
        </p>
        {error && <div className="error-banner">{error}</div>}
        <label>
          Username
          <input value={form.username} onChange={update("username")} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={update("email")} required />
        </label>
        <div className="field-row">
          <label>
            First name
            <input value={form.first_name} onChange={update("first_name")} />
          </label>
          <label>
            Last name
            <input value={form.last_name} onChange={update("last_name")} />
          </label>
        </div>
        <label>
          Password
          <input
            type="password"
            minLength={8}
            value={form.password}
            onChange={update("password")}
            required
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Register"}
        </button>
        <p className="muted small">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
