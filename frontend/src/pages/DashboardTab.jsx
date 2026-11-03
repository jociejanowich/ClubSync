import { useEffect, useState } from "react";
import { api } from "../api";

export default function DashboardTab({ clubId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getDashboard(clubId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [clubId]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="muted">Loading dashboard...</p>;

  return (
    <div>
      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-value">{data.total_members}</span>
          <span className="stat-label">Total Members</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data.officer_count}</span>
          <span className="stat-label">Officers</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data.upcoming_events}</span>
          <span className="stat-label">Upcoming Events</span>
        </div>
      </div>

      <h3>Recent Attendance</h3>
      {data.recent_attendance.length === 0 ? (
        <p className="muted">No past events with attendance recorded yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Present</th>
              <th>Total Recorded</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_attendance.map((row) => (
              <tr key={row.event_id}>
                <td>{row.title}</td>
                <td>{new Date(row.start_time).toLocaleDateString()}</td>
                <td>{row.present}</td>
                <td>{row.total_recorded}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
