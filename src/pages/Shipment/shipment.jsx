import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/mainLayout";
import CreateShipmentDrawer from "./CreateShipmentDrawer";
import { shipments as shipmentsApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./shipment.css";

export default function Shipment() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("active");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [shipmentData, setShipmentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const fetchShipments = useCallback(() => {
    setLoading(true);
    const status = currentTab === "active" ? "in_transit,loading,pending" : "completed,delivered";
    shipmentsApi.list({ status, page, limit: LIMIT })
      .then(res => {
        setShipmentData(res.data || []);
        setTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentTab, page]);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  return (
    <MainLayout>
      {/* Global Topbar Header Area */}
      <header className="topbar">
        <div className="search-container">
          <i className="las la-search topbar-search-icon"></i>
          <input
            type="text"
            id="shipmentSearch"
            placeholder="Search..."
            onChange={(e) => console.log("Searching:", e.target.value)}
          />
        </div>

        <div className="topbar-right">
          <button id="notifBtn" className="notification-btn" onClick={() => alert("No new notifications")}>
            <i className="las la-bell"></i>
          </button>
          <div
              className="avatar"
              onClick={() => navigate("/settings/account")}
              style={{ cursor: "pointer" }}
              title="Go to Account Settings"
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60" 
                alt="User Profile" 
                className="avatar-img"
              />
            </div>
        </div>
      </header>

      {/* Main Content Workspace Layout Canvas */}
      <section className="content">
        
        {/* Dynamic Title and Action Button based on Tab View */}
        <div className="header-row">
          <div className="header">
            <h2>Shipments - {currentTab === "active" ? "Active Operations" : "Completed Operations"}</h2>
            <p>
              {currentTab === "active" 
                ? "Real-time view of all ongoing shipments currently in transit, loading, or preparing for departure."
                : "Historical record of safely fulfilled regional freight movements across the Nueva Ecija network."}
            </p>
          </div>
          
          <button className="btn-primary" onClick={() => setIsDrawerOpen(true)}>
            <i className="las la-plus"></i> ADD SHIPMENT
          </button>
        </div>

        {/* Dynamic Operational Cards Block Row */}
        <div className="stats">
          {currentTab === "active" ? (
            <>
              <div className="stat-card completed">
                <div className="stat-header">
                  <h4>In Transit</h4>
                  <i className="las la-truck stat-icon text-transit"></i>
                </div>
                <h2>{loading ? "—" : shipmentData.filter(s => s.status === "in_transit").length}</h2>
                <p>Currently on the road</p>
              </div>
              <div className="stat-card ontime">
                <div className="stat-header">
                  <h4>Loading / Preparing</h4>
                  <i className="las la-box stat-icon text-loading"></i>
                </div>
                <h2>{loading ? "—" : shipmentData.filter(s => s.status === "loading").length}</h2>
                <p>Awaiting dispatch parameters</p>
              </div>
              <div className="stat-card late">
                <div className="stat-header">
                  <h4>Delayed</h4>
                  <i className="las la-exclamation-triangle stat-icon text-delayed"></i>
                </div>
                <h2>{loading ? "—" : shipmentData.filter(s => s.status === "delayed").length}</h2>
                <p className="text-danger-accent">Immediate routing review required</p>
              </div>
            </>
          ) : (
            <>
              <div className="stat-card completed">
                <div className="stat-header">
                  <h4>Completed Today</h4>
                  <i className="las la-check-circle stat-icon"></i>
                </div>
                <h2>{loading ? "—" : shipmentData.filter(s => s.status === "delivered").length}</h2>
                <p>Deliveries finished today</p>
              </div>
              <div className="stat-card ontime">
                <div className="stat-header">
                  <h4>On Time Fulfill</h4>
                  <i className="las la-clock stat-icon"></i>
                </div>
                <h2>{loading ? "—" : shipmentData.filter(s => s.status === "delivered" && !s.is_late).length}</h2>
                <p>Fulfilled on schedule</p>
              </div>
              <div className="stat-card late">
                <div className="stat-header">
                  <h4>Late Deliveries</h4>
                  <i className="las la-exclamation-triangle stat-icon"></i>
                </div>
                <h2>{loading ? "—" : shipmentData.filter(s => s.status === "delivered" && s.is_late).length}</h2>
                <p>Delivered but outside window</p>
              </div>
            </>
          )}

          <div className="stat-card trips">
            <div className="stat-header">
              <h4>Total Shipments</h4>
              <i className="las la-chart-bar stat-icon"></i>
            </div>
            <h2>{loading ? "—" : total}</h2>
            <p>Showing {shipmentData.length}</p>
          </div>
        </div>

        {/* INTERACTIVE NAVIGATION SUB-TABS OVERHAUL */}
        <div className="view-tabs">
          <div
            className={`tab ${currentTab === "active" ? "active" : ""}`}
            onClick={() => { setCurrentTab("active"); setPage(1); }}
          >
            Active <span className="badge">{loading ? "—" : shipmentData.length}</span>
          </div>
          <div className="tab">
            Delayed <span className="badge badge-danger">{loading ? "—" : shipmentData.filter(s => s.status === "delayed").length}</span>
          </div>
          <div
            className={`tab ${currentTab === "completed" ? "active" : ""}`}
            onClick={() => { setCurrentTab("completed"); setPage(1); }}
          >
            Completed
          </div>
          <div className="tab">
            Review <span className="badge badge-warning">—</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="table-controls">
          <div className="search-wrapper">
            <i className="las la-search table-search-icon"></i>
            <input
              type="text"
              className="table-search"
              placeholder="Search by ID, route point, or driver..."
            />
          </div>
          <button className="control-btn">SORT BY <i className="las la-bars"></i></button>
          <button className="control-btn">TODAY <i className="las la-calendar"></i></button>
          <button className="control-btn"><i className="las la-sliders-h"></i></button>
        </div>

        {/* DYNAMIC CONDITION TABLE CONTAINER SWITCH */}
        <div className="shipment-table-card">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading shipments…</div>
          ) : (
            <table className="shipment-table">
              {currentTab === "active" ? (
                /* ACTIVE OPERATIONS DATA VIEW */
                <>
                  <thead>
                    <tr>
                      <th>Shipment ID</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>Status</th>
                      <th>Assigned Driver</th>
                      <th>Estimated Delivery</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipmentData.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>No active shipments.</td></tr>
                    ) : (
                      shipmentData.map((ship) => (
                        <tr key={ship.id}>
                          <td>
                            <div className="cell-bold">{ship.shipment_code}</div>
                            <div className="cell-sub">{ship.cargo_type || "General Cargo"}</div>
                          </td>
                          <td>
                            <div className="text-dark-bold">{ship.origin}</div>
                            <div className="cell-sub">—</div>
                          </td>
                          <td>
                            <div className="text-dark-bold">{ship.destination}</div>
                            <div className="cell-sub">—</div>
                          </td>
                          <td>
                            <span className={`status ${ship.status}-pill`}>● {ship.status.toUpperCase()}</span>
                          </td>
                          <td>
                            <div className="text-dark-bold">{ship.driver_name || "—"}</div>
                            <div className="cell-sub">{ship.vehicle_plate ? `Fleet: ${ship.vehicle_plate}` : "—"}</div>
                          </td>
                          <td>
                            <div className="text-dark-bold">{ship.estimated_delivery ? new Date(ship.estimated_delivery).toLocaleDateString("en-PH") : "—"}</div>
                            <div className="status-sub-indicator text-muted-gray">{ship.is_late ? "Delayed" : "On Time"}</div>
                          </td>
                          <td><button className="action-btn"><i className="las la-ellipsis-v"></i></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              ) : (
                /* COMPLETED OPERATIONS DATA VIEW */
                <>
                  <thead>
                    <tr>
                      <th>Shipment ID</th>
                      <th>Customer</th>
                      <th>Route</th>
                      <th>Driver & Vehicle</th>
                      <th>Target Delivery</th>
                      <th>Actual Delivery</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipmentData.length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>No completed shipments.</td></tr>
                    ) : (
                      shipmentData.map((ship) => (
                        <tr key={ship.id}>
                          <td>
                            <div className="cell-bold">{ship.shipment_code}</div>
                            <div className="cell-sub">{ship.cargo_type || "General Cargo"}</div>
                          </td>
                          <td>
                            <div className="customer-cell">
                              <div className="customer-avatar avatar-blue">{ship.customer_name?.slice(0, 2).toUpperCase() || "—"}</div>
                              <div className="text-dark-bold">{ship.customer_name || "—"}</div>
                            </div>
                          </td>
                          <td>
                            <div className="text-dark-bold">{ship.origin} <span className="route-arrow">→</span> {ship.destination}</div>
                          </td>
                          <td>
                            <div className="text-dark-bold">{ship.driver_name || "—"}</div>
                            <div className="cell-sub">{ship.vehicle_plate ? `Fleet: ${ship.vehicle_plate}` : "—"}</div>
                          </td>
                          <td>{ship.estimated_delivery ? new Date(ship.estimated_delivery).toLocaleDateString("en-PH") : "—"}</td>
                          <td className="text-dark-bold">{ship.delivered_at ? new Date(ship.delivered_at).toLocaleDateString("en-PH") : "—"}</td>
                          <td>
                            <span className={`status ${ship.status}`}><i className="las la-check-circle"></i> {ship.status.toUpperCase()}</span>
                          </td>
                          <td><button className="action-btn"><i className="las la-ellipsis-v"></i></button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              )}
            </table>
          )}

          {/* Bottom Table Pagination Control Footer */}
          <div className="table-pagination-footer">
            <span className="pagination-summary">
              Showing {shipmentData.length} of {total} Shipments
            </span>
            <div className="pagination-controls-group">
              <button className="page-nav-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><i className="las la-angle-left"></i></button>
              <button className="page-number-btn active">{page}</button>
              {total > LIMIT && <button className="page-number-btn" onClick={() => setPage(p => p + 1)}>{page + 1}</button>}
              <button className="page-nav-btn" onClick={() => setPage(p => p + 1)} disabled={shipmentData.length < LIMIT}><i className="las la-angle-right"></i></button>
            </div>
          </div>
        </div>
      </section>

      {/* Slide-out Overlay Form Component */}
      <CreateShipmentDrawer isOpen={isDrawerOpen} onClose={() => { setIsDrawerOpen(false); fetchShipments(); }} />
    </MainLayout>
  );
}
