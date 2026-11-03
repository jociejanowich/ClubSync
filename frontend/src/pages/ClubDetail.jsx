import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import RosterTab from "./RosterTab";
import CalendarTab from "./CalendarTab";
import DashboardTab from "./DashboardTab";

export default function ClubDetail() {
  const { clubId } = useParams();
  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("dashboard");

  const loadClub = async () => {
    try {
      setClub(await api.getClub(clubId));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadClub();
    setTab("dashboard");
  }, [clubId]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!club) return <p className="muted">Loading club...</p>;

  const isOfficer = club.my_role === "officer";

  return (
    <div>
      <Link to="/" className="back-link">
        &larr; All Clubs
      </Link>
      <div className="page-header">
        <div>
          <h2>{club.name}</h2>
          <p className="muted">{club.description}</p>
        </div>
        <span className={`role-tag role-${club.my_role}`}>Signed in as: {club.my_role}</span>
      </div>

      <div className="tabs">
        <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
          Dashboard
        </button>
        <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}>
          Calendar &amp; Attendance
        </button>
        <button className={tab === "roster" ? "active" : ""} onClick={() => setTab("roster")}>
          Roster
        </button>
      </div>

      <div className="tab-panel">
        {tab === "dashboard" && <DashboardTab clubId={clubId} />}
        {tab === "calendar" && (
          <CalendarTab clubId={clubId} isOfficer={isOfficer} currentUserId={user?.id} />
        )}
        {tab === "roster" && <RosterTab clubId={clubId} isOfficer={isOfficer} />}
      </div>
    </div>
  );
}
