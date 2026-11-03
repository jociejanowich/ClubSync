const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

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
    const message =
      (data && (data.detail || JSON.stringify(data))) || `Request failed (${res.status})`;
    throw new Error(message);
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
