const API_BASE = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api`;

function getToken() {
  return localStorage.getItem("clubsync_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("clubsync_token", token);
  } else {
    localStorage.removeItem("clubsync_token");
  }
}

// Turns any DRF error shape into one readable sentence:
// {"detail": "..."}, {"error": "..."}, or field errors like {"email": ["..."]}
function errorMessage(data, status) {
  if (!data) return `Request failed (${status})`;
  if (typeof data === "string") return data;
  if (data.detail) return String(data.detail);
  if (data.error) return String(data.error);
  const parts = Object.entries(data).map(([field, msgs]) => {
    const text = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
    return field === "non_field_errors" ? text : `${field.replace("_", " ")}: ${text}`;
  });
  return parts.join(" ") || `Request failed (${status})`;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Token ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(errorMessage(data, res.status));
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register/", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login/", { method: "POST", body: payload }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  me: () => request("/auth/me/"),

  listClubs: () => request("/clubs/"),
  createClub: (payload) => request("/clubs/", { method: "POST", body: payload }),
  getClub: (id) => request(`/clubs/${id}/`),
  getDashboard: (id) => request(`/clubs/${id}/dashboard/`),

  getRoster: (clubId) => request(`/clubs/${clubId}/roster/`),
  addRosterMember: (clubId, payload) =>
    request(`/clubs/${clubId}/roster/`, { method: "POST", body: payload }),
  updateRosterMember: (clubId, membershipId, payload) =>
    request(`/clubs/${clubId}/roster/${membershipId}/`, { method: "PATCH", body: payload }),
  removeRosterMember: (clubId, membershipId) =>
    request(`/clubs/${clubId}/roster/${membershipId}/`, { method: "DELETE" }),

  listEvents: (clubId) => request(`/events/?club=${clubId}`),
  createEvent: (payload) => request("/events/", { method: "POST", body: payload }),
  updateEvent: (id, payload) => request(`/events/${id}/`, { method: "PATCH", body: payload }),
  deleteEvent: (id) => request(`/events/${id}/`, { method: "DELETE" }),

  getAttendance: (eventId) => request(`/events/${eventId}/attendance/`),
  markAttendance: (eventId, payload) =>
    request(`/events/${eventId}/attendance/`, { method: "POST", body: payload }),
};
