import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/mainLayout";
import { useAuth } from "../../context/AuthContext";
import { dashboard as dashApi } from "../../services/api";
import "./dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    Promise.all([dashApi.stats(), dashApi.alerts(), dashApi.feed()])
      .then(([s, a, f]) => {
        setStats(s);
        setAlerts(a.data || []);
        setFeed(f.data || []);
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  }, []);

  const complianceAlerts = alerts.filter((a) => a.type === "compliance");
  const shipmentAlerts   = alerts.filter((a) => a.type === "shipment");

  return (
    <MainLayout>
      {/* Topbar */}
      <header className="topbar">
        <h1>Dashboard</h1>
        <input
          type="text"
          id="search"
          placeholder="Search fleet..."
          onChange={(e) => console.log("Searching:", e.target.value)}
        />
        <div className="topbar-right">
          <button id="notifBtn" onClick={() => alert("No new notifications")}>🔔</button>
          <div
            className="avatar"
            onClick={() => navigate("/settings/account")}
            style={{ cursor: "pointer" }}
            title="Go to Account Settings"
          >
            <img
              src={user?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60"}
              alt="User Profile"
              className="avatar-img"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="content">
        <div className="header">
          <span>SERVICING NUEVA ECIJA</span>
          <h2>Fleet Operations Overview</h2>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat-card">
            <h4>Active Shipments</h4>
            <h2>{loadingStats ? "—" : stats?.active_shipments ?? 0}</h2>
            <p className="green">In transit &amp; loading</p>
          </div>
          <div className="stat-card">
            <h4>Delayed Shipments</h4>
            <h2>{loadingStats ? "—" : stats?.delayed_shipments ?? 0}</h2>
            <p className="red">Requires attention</p>
          </div>
          <div className="stat-card">
            <h4>Available Trucks</h4>
            <h2>{loadingStats ? "—" : stats?.available_trucks ?? 0}</h2>
            <p className="yellow">Ready for dispatch</p>
          </div>
          <div className="stat-card">
            <h4>Pending Dispatch</h4>
            <h2>{loadingStats ? "—" : stats?.pending_dispatch ?? 0}</h2>
            <p className="gray">Ready for assignment</p>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid">
          {/* Map placeholder */}
          <div className="map-card">
            <img src="/assets/images/map.png" alt="Map View" />
          </div>

          {/* Right Panel */}
          <div className="right-panel">
            <h3>Priority Alerts</h3>
            {complianceAlerts.length === 0 && shipmentAlerts.length === 0 && (
              <div className="alert gray">No active alerts</div>
            )}
            {shipmentAlerts.map((a, i) => (
              <div key={i} className="alert red">
                Route delay — {a.shipment_code}: {a.origin} → {a.destination}
              </div>
            ))}
            {complianceAlerts.map((a, i) => (
              <div key={i} className="alert orange">
                {a.doc_type} expiring — {a.entity_name}
              </div>
            ))}

            <h3>Operations Feed</h3>
            <div className="feed">
              {feed.length === 0 && <p>No recent activity</p>}
              {feed.slice(0, 6).map((item) => (
                <p key={item.id}>
                  {item.user_name && <strong>{item.user_name}: </strong>}
                  {item.action.replace(/_/g, " ").toLowerCase()}
                  {item.entity_type ? ` (${item.entity_type})` : ""}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="bottom">
          <div className="analytics card">
            <h3>Performance &amp; Analytics</h3>
            <p>Active shipments: {stats?.active_shipments ?? "—"}</p>
            <p>Delayed: {stats?.delayed_shipments ?? "—"}</p>
            <p>Pending dispatch: {stats?.pending_dispatch ?? "—"}</p>
            <div className="chart">Live data from TANAW API</div>
          </div>

          <div className="resources card">
            <h3>Resource Snapshot</h3>
            <div>
              <span>Available Trucks</span>
              <div className="bar green"></div>
            </div>
            <div>
              <span>In Transit</span>
              <div className="bar blue"></div>
            </div>
            <div>
              <span>Pending</span>
              <div className="bar orange"></div>
            </div>
            <p>Logged in as: {user?.full_name ?? "—"}</p>
            <p>Role: {user?.role ?? "—"}</p>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}