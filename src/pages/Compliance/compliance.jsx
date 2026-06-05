import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { compliance as complianceApi, drivers as driversApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./compliance.css";

export default function Compliance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reportsSubmenuHidden, setReportsSubmenuHidden] = useState(true);
  const [settingsSubmenuHidden, setSettingsSubmenuHidden] = useState(true);

  // API state
  const [complianceData, setComplianceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);

  const fetchCompliance = useCallback(() => {
    setLoading(true);
    const params = driverId ? { driver_id: driverId } : {};
    complianceApi.list(params)
      .then(res => setComplianceData(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [driverId]);

  useEffect(() => { fetchCompliance(); }, [fetchCompliance]);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <h2>Mabutol Tracking</h2>
          <p>NUEVA ECIJA LOGISTICS</p>
        </div>

        <nav className="menu">
          <div 
            className="menu-item" 
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </div>
          <div 
            className="menu-item" 
            onClick={() => navigate("/shipment")}
          >
            Shipments
          </div>
          <div 
            className="menu-item" 
            onClick={() => navigate("/fleet")}
          >
            Fleet Management
          </div>
          <div 
            className="menu-item" 
            onClick={() => navigate("/customer")}
          >
            Customers
          </div>
          <div 
            className="menu-item active" 
            onClick={() => navigate("/compliance")}
          >
            Compliance
          </div>
          
          <div className="menu-group">
            <div
              className="menu-item"
              id="reportsToggle"
              onClick={() => setReportsSubmenuHidden(!reportsSubmenuHidden)}
            >
              Reports
            </div>

            <div
              className={`submenu ${reportsSubmenuHidden ? "hidden" : ""}`}
              id="reportsSubmenu"
            >
              <div
                className="submenu-item active"
                onClick={() => navigate("/report/overview")}
              >
                Overview
              </div>

              <div
                className="submenu-item"
                onClick={() => navigate("/report/shipmentReport")}
              >
                Shipments
              </div>

              <div
                className="submenu-item"
                onClick={() => navigate("/report/driverReport")}
              >
                Drivers
              </div>

              <div
                className="submenu-item"
                onClick={() => navigate("/report/revenueReport")}
              >
                Revenue
              </div>
            </div>
          </div>
          
          {/* Settings Dropdown */}
          <div className="menu-group">
            <div
              className="menu-item"
              id="settingsToggle"
              onClick={() => setSettingsSubmenuHidden(!settingsSubmenuHidden)}
            >
              Settings
            </div>

            <div
              className={`submenu ${settingsSubmenuHidden ? "hidden" : ""}`}
              id="settingsSubmenu"
            >
              <div
                className="submenu-item"
                onClick={() => navigate("/settings/account")}
              >
                Account
              </div>
              <div
                className="submenu-item"
                onClick={() => navigate("/settings/notification")}
              >
                Notifications
              </div>
              <div
                className="submenu-item"
                onClick={() => navigate("/settings/pricing")}
              >
                Pricing
              </div>
              <div
                className="submenu-item"
                onClick={() => navigate("/settings/complianceThreshold")}
              >
                Compliance Thresholds
              </div>
              <div
                className="submenu-item"
                onClick={() => navigate("/settings/userManagement")}
              >
                User Management
              </div>
              <div
                className="submenu-item"
                onClick={() => navigate("/settings/security")}
              >
                Security
              </div>
            </div>
          </div>
        </nav>

        <div className="sidebar-bottom">
          <span>Help Center</span>
          <span>Log Out</span>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        {/* Topbar */}
        <header className="topbar">
          <h1>Compliance</h1>

          <input
            type="text"
            placeholder="Search compliance..."
            id="complianceSearch"
            onChange={(e) => console.log("Searching compliance:", e.target.value)}
          />

          <div className="topbar-right">
            <button id="notifBtn" onClick={() => alert("No new notifications")}>
              🔔
            </button>
            <div className="avatar"></div>
          </div>
        </header>

        {/* Content */}
        <section className="content">
          <div className="header">
            <span>DRIVER REGULATIONS</span>
            <h2>Driver Compliance</h2>
          </div>

          {/* Stats */}
          <div className="stats">
            <div className="stat-card">
              <h4>Fully Compliant</h4>
              <h2>{loading ? "—" : complianceData.filter(c => c.status === "compliant").length}</h2>
              <p className="green">All requirements complete</p>
            </div>

            <div className="stat-card">
              <h4>Expiring Soon</h4>
              <h2>{loading ? "—" : complianceData.filter(c => c.status === "expiring_soon").length}</h2>
              <p className="yellow">Renewal required</p>
            </div>

            <div className="stat-card">
              <h4>Expired</h4>
              <h2>{loading ? "—" : complianceData.filter(c => c.status === "expired").length}</h2>
              <p className="red">Immediate action needed</p>
            </div>

            <div className="stat-card">
              <h4>Pending Review</h4>
              <h2>{loading ? "—" : complianceData.filter(c => c.status === "pending").length}</h2>
              <p className="blue">Awaiting approval</p>
            </div>
          </div>

          {/* Compliance Table */}
          <div className="compliance-table-card">
            <div className="table-header">
              <input
                type="text"
                className="table-search"
                placeholder="Search compliance..."
              />
            </div>

            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading compliance data…</div>
            ) : (
              <table className="compliance-table">
                <thead>
                  <tr>
                    <th>Driver</th>
                    <th>License</th>
                    <th>Medical</th>
                    <th>NBI</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>

                <tbody>
                  {complianceData.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>No compliance records found.</td></tr>
                  ) : (
                    complianceData.map((record) => (
                      <tr key={record.id}>
                        <td>{record.driver_name || "—"}</td>
                        <td><span className={`badge ${record.license_status === "valid" ? "valid" : record.license_status === "expired" ? "expired" : "review"}`}>{record.license_status?.toUpperCase() || "—"}</span></td>
                        <td><span className={`badge ${record.medical_status === "valid" ? "valid" : record.medical_status === "expired" ? "expired" : "review"}`}>{record.medical_status?.toUpperCase() || "—"}</span></td>
                        <td><span className={`badge ${record.nbi_status === "valid" ? "valid" : record.nbi_status === "expired" ? "expired" : "review"}`}>{record.nbi_status?.toUpperCase() || "—"}</span></td>
                        <td><span className={`status ${record.status === "compliant" ? "compliant" : record.status === "expired" ? "expired-status" : "review-status"}`}>{record.status?.toUpperCase().replace(/_/g, "-")}</span></td>
                        <td>{record.updated_at ? new Date(record.updated_at).toLocaleDateString("en-PH") : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
