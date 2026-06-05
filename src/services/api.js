// ─── TANAW API Service Layer ──────────────────────────────────────────────────
// Base URL — change to your deployed API URL in production
const BASE_URL = import.meta.env.VITE_API_URL || "postgresql://neondb_owner:npg_QJWl1hGKOXL3@ep-orange-frog-aqnj0jjo-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// ── Token helpers ─────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("tanaw_token");
export const setToken = (token) => localStorage.setItem("tanaw_token", token);
export const removeToken = () => localStorage.removeItem("tanaw_token");

export const getUser = () => {
  const u = localStorage.getItem("tanaw_user");
  return u ? JSON.parse(u) : null;
};
export const setUser = (user) =>
  localStorage.setItem("tanaw_user", JSON.stringify(user));
export const removeUser = () => localStorage.removeItem("tanaw_user");

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token expired / invalid → force logout
    removeToken();
    removeUser();
    window.location.href = "/";
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request("/api/auth/me"),

  changePassword: (current_password, new_password) =>
    request("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ current_password, new_password }),
    }),

  register: (body) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  stats: () => request("/api/dashboard/stats"),
  feed: () => request("/api/dashboard/feed"),
  alerts: () => request("/api/dashboard/alerts"),
};

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/customers${qs ? "?" + qs : ""}`);
  },
  get: (id) => request(`/api/customers/${id}`),
  create: (body) =>
    request("/api/customers", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/api/customers/${id}`, { method: "DELETE" }),
};

// ── Shipments ─────────────────────────────────────────────────────────────────
export const shipments = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/shipments${qs ? "?" + qs : ""}`);
  },
  get: (id) => request(`/api/shipments/${id}`),
  create: (body) =>
    request("/api/shipments", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/shipments/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/api/shipments/${id}`, { method: "DELETE" }),
};

// ── Vehicles ──────────────────────────────────────────────────────────────────
export const vehicles = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/vehicles${qs ? "?" + qs : ""}`);
  },
  get: (id) => request(`/api/vehicles/${id}`),
  create: (body) =>
    request("/api/vehicles", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/api/vehicles/${id}`, { method: "DELETE" }),
  addMaintenance: (id, body) =>
    request(`/api/vehicles/${id}/maintenance`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

// ── Drivers ───────────────────────────────────────────────────────────────────
export const drivers = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/drivers${qs ? "?" + qs : ""}`);
  },
  get: (id) => request(`/api/drivers/${id}`),
  create: (body) =>
    request("/api/drivers", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/drivers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/api/drivers/${id}`, { method: "DELETE" }),
};

// ── Compliance ────────────────────────────────────────────────────────────────
export const compliance = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/compliance${qs ? "?" + qs : ""}`);
  },
  create: (body) =>
    request("/api/compliance", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/compliance/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/api/compliance/${id}`, { method: "DELETE" }),
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const reports = {
  shipments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/dashboard/reports/shipments${qs ? "?" + qs : ""}`);
  },
  revenue: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/dashboard/reports/revenue${qs ? "?" + qs : ""}`);
  },
  drivers: () => request("/api/dashboard/reports/drivers"),
};

// ── Pricing ───────────────────────────────────────────────────────────────────
export const pricing = {
  list: () => request("/api/pricing"),
  create: (body) =>
    request("/api/pricing", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/api/pricing/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id) => request(`/api/pricing/${id}`, { method: "DELETE" }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = {
  list: () => request("/api/notifications"),
  markRead: (id) =>
    request(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    request("/api/notifications/read-all", { method: "PATCH" }),
};