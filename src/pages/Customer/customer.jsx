import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../../layouts/mainLayout";
import { customers as customersApi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./customer.css";

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function Customer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openMenuId, setOpenMenuId] = useState(null);
  const [profileModal, setProfileModal] = useState(null);
  const [bookingHistoryModal, setBookingHistoryModal] = useState(null);
  const menuRef = useRef(null);

  // API state
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileDetail, setProfileDetail] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const LIMIT = 10;

  const fetchCustomers = useCallback(() => {
    setLoading(true);
    customersApi.list({ search, page, limit: LIMIT })
      .then(res => { setCustomers(res.data || []); setTotal(res.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (profileModal || bookingHistoryModal) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [profileModal, bookingHistoryModal]);

  const handleViewProfile = async (cust) => {
    setOpenMenuId(null);
    setProfileModal(cust);
    setProfileLoading(true);
    try {
      const detail = await customersApi.get(cust.id);
      setProfileDetail(detail);
    } catch (e) { console.error(e); }
    finally { setProfileLoading(false); }
  };

  const handleViewBookingHistory = async (cust) => {
    setOpenMenuId(null);
    setBookingHistoryModal(cust);
    setProfileLoading(true);
    try {
      const detail = await customersApi.get(cust.id);
      setProfileDetail(detail);
    } catch (e) { console.error(e); }
    finally { setProfileLoading(false); }
  };

  const handleSuspend = async (cust) => {
    setOpenMenuId(null);
    const newStatus = cust.status === "active" ? "suspended" : "active";
    try {
      await customersApi.update(cust.id, { status: newStatus });
      fetchCustomers();
    } catch (e) { alert(e.message); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Aggregate stats from loaded data (simple counts from API total)
  const activeCount = customers.filter(c => c.status === "active").length;
  const suspendedCount = customers.filter(c => c.status === "suspended").length;

  return (
    <MainLayout>
      <header className="topbar">
        <div className="search-container">
          <span className="icon">🔍</span>
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="topbar-right">
          <button id="notifBtn">🔔</button>
          <div className="avatar" onClick={() => navigate("/Settings/account")} style={{ cursor: "pointer" }} title="Account Settings">
            <img src={user?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60"} alt="User Profile" className="avatar-img" />
          </div>
        </div>
      </header>

      <section className="content">
        <div className="content-header">
          <div>
            <h2 className="page-title">Customers</h2>
            <p className="page-subtitle">View and monitor registered customers from the mobile app.</p>
          </div>
          <button className="btn-export">📥 Export</button>
        </div>

        <div className="stats-container">
          <div className="stat-card total-cust"><h4>TOTAL CUSTOMERS</h4><h2>{total}</h2></div>
          <div className="stat-card active-cust"><h4>ACTIVE (THIS PAGE)</h4><h2>{activeCount}</h2></div>
          <div className="stat-card new-cust"><h4>SHOWING</h4><h2>{customers.length}</h2></div>
          <div className="stat-card suspended-cust"><h4>SUSPENDED (THIS PAGE)</h4><h2>{suspendedCount}</h2></div>
        </div>

        <div className="filter-action-bar">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input type="text" className="table-search" placeholder="Search by name, email, or ID..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="filter-buttons">
            <button className="filter-btn">SORT BY <span className="btn-icon">≡</span></button>
            <button className="filter-btn" onClick={fetchCustomers}>REFRESH <span className="btn-icon">↻</span></button>
          </div>
        </div>

        <div className="customer-table-card">
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading customers…</div>
          ) : (
            <table className="customer-table">
              <thead>
                <tr>
                  <th>CUSTOMER</th>
                  <th>CONTACT NUMBER</th>
                  <th>TOTAL BOOKINGS</th>
                  <th>LAST BOOKING</th>
                  <th>MEMBER SINCE</th>
                  <th>STATUS</th>
                  <th className="text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>No customers found.</td></tr>
                )}
                {customers.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div className="customer-info-cell">
                        <div className="table-avatar"></div>
                        <div>
                          <div className="cust-name">{cust.full_name}</div>
                          <div className="cust-email">{cust.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="phone-cell">📞 {cust.phone || "—"}</span></td>
                    <td>{cust.total_bookings ?? 0} bookings</td>
                    <td>{cust.last_booking_at ? formatDate(cust.last_booking_at) : "—"}</td>
                    <td>{cust.member_since ? formatDate(cust.member_since) : formatDate(cust.created_at)}</td>
                    <td>
                      <span className={`status-badge ${(cust.status || "active").toLowerCase()}`}>
                        {(cust.status || "active").toUpperCase()}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="action-menu-wrapper" ref={openMenuId === cust.id ? menuRef : null}>
                        <button className="action-dots-btn" onClick={() => setOpenMenuId(openMenuId === cust.id ? null : cust.id)}>⋮</button>
                        {openMenuId === cust.id && (
                          <div className="action-dropdown">
                            <button className="dropdown-item" onClick={() => handleViewProfile(cust)}>View Profile</button>
                            <button className="dropdown-item" onClick={() => handleViewBookingHistory(cust)}>View Booking History</button>
                            <button className="dropdown-item danger" onClick={() => handleSuspend(cust)}>
                              {cust.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="table-pagination">
            <span className="pagination-text">Showing {customers.length} of {total} customers</span>
            <div className="pagination-controls">
              <button className="page-arrow" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-number ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              {totalPages > 5 && <span className="page-dots">...</span>}
              <button className="page-arrow" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>›</button>
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER PROFILE MODAL */}
      {profileModal && (
        <div className="cp-backdrop" onClick={() => { setProfileModal(null); setProfileDetail(null); }}>
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <div className="cp-modal-title-row">
                <h2 className="cp-modal-title">Customer Profile</h2>
                <span className={`cp-status-pill ${(profileModal.status || "active").toLowerCase()}`}>
                  {(profileModal.status || "active").toUpperCase()}
                </span>
              </div>
              <button className="cp-close-btn" onClick={() => { setProfileModal(null); setProfileDetail(null); }}>✕</button>
            </div>

            <div className="cp-modal-body">
              <div className="cp-left">
                <div className="cp-identity-card">
                  <div className="cp-avatar-box">
                    <div className="cp-avatar-placeholder">
                      {profileModal.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                  </div>
                  <h3 className="cp-name">{profileModal.full_name}</h3>
                  <p className="cp-cust-id">ID: {profileModal.customer_code}</p>
                  <div className="cp-details-list">
                    <div className="cp-detail-row"><span className="cp-detail-icon">✉</span><div><div className="cp-detail-label">EMAIL</div><div className="cp-detail-value">{profileModal.email}</div></div></div>
                    <div className="cp-detail-row"><span className="cp-detail-icon">📞</span><div><div className="cp-detail-label">CONTACT</div><div className="cp-detail-value">{profileModal.phone || "—"}</div></div></div>
                    <div className="cp-detail-row"><span className="cp-detail-icon">📍</span><div><div className="cp-detail-label">ADDRESS</div><div className="cp-detail-value">{[profileModal.address, profileModal.city, profileModal.province].filter(Boolean).join(", ") || "—"}</div></div></div>
                    <div className="cp-detail-row"><span className="cp-detail-icon">📅</span><div><div className="cp-detail-label">MEMBER SINCE</div><div className="cp-detail-value">{formatDate(profileModal.member_since || profileModal.created_at)}</div></div></div>
                  </div>
                </div>
                <div className="cp-status-card">
                  <h4 className="cp-section-label">ACCOUNT STATUS</h4>
                  <div className="cp-status-row">
                    <span>Current Status</span>
                    <span className={`cp-status-dot ${(profileModal.status || "active").toLowerCase()}`}>
                      ● {profileModal.status === "suspended" ? "Suspended" : "Active"}
                    </span>
                  </div>
                  <button className="cp-suspend-btn" onClick={() => { handleSuspend(profileModal); setProfileModal(null); }}>
                    🚫 {profileModal.status === "suspended" ? "Reactivate Account" : "Suspend Account"}
                  </button>
                  <p className="cp-suspend-hint">Suspending this account will prevent new bookings.</p>
                </div>
              </div>

              <div className="cp-right">
                {profileLoading ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Loading details…</div>
                ) : profileDetail ? (
                  <>
                    <div className="cp-section-title-row"><h4 className="cp-section-label">BOOKING SUMMARY</h4></div>
                    <div className="cp-summary-grid">
                      <div className="cp-summary-card"><div className="cp-summary-label">TOTAL</div><div className="cp-summary-value">{profileDetail.total_bookings ?? 0}</div><div className="cp-summary-accent neutral"></div></div>
                      <div className="cp-summary-card"><div className="cp-summary-label">COMPLETED</div><div className="cp-summary-value">{profileDetail.completed_bookings ?? 0}</div><div className="cp-summary-accent green"></div></div>
                      <div className="cp-summary-card"><div className="cp-summary-label">CANCELLED</div><div className="cp-summary-value">{profileDetail.cancelled_bookings ?? 0}</div><div className="cp-summary-accent red"></div></div>
                      <div className="cp-summary-card"><div className="cp-summary-label">ACTIVE NOW</div><div className="cp-summary-value">{profileDetail.active_now ?? 0}</div><div className="cp-summary-accent blue"></div></div>
                    </div>
                    <div className="cp-recent-header">
                      <h4 className="cp-section-label">RECENT BOOKINGS</h4>
                      <button className="cp-view-all-btn" onClick={() => { setProfileModal(null); setBookingHistoryModal(profileModal); }}>View All →</button>
                    </div>
                    <div className="cp-bookings-table-wrap">
                      <table className="cp-bookings-table">
                        <thead><tr><th>SHIPMENT ID</th><th>ROUTE</th><th>DATE</th><th>STATUS</th></tr></thead>
                        <tbody>
                          {(profileDetail.recent_bookings || []).map((b) => (
                            <tr key={b.shipment_code}>
                              <td className="cp-shipment-id">{b.shipment_code}</td>
                              <td>{b.origin} → {b.destination}</td>
                              <td>{formatDate(b.created_at)}</td>
                              <td><span className={`cp-booking-status ${b.status}`}>{b.status}</span></td>
                            </tr>
                          ))}
                          {!(profileDetail.recent_bookings?.length) && (
                            <tr><td colSpan="4" style={{ textAlign: "center", color: "#64748b" }}>No bookings yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING HISTORY MODAL */}
      {bookingHistoryModal && (
        <div className="bh-backdrop" onClick={() => { setBookingHistoryModal(null); setProfileDetail(null); }}>
          <div className="bh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bh-modal-header">
              <div className="bh-header-left">
                <div className="bh-avatar-placeholder">
                  {bookingHistoryModal.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h2 className="bh-modal-title">{bookingHistoryModal.full_name}</h2>
                  <p className="bh-modal-meta">
                    <span className="bh-meta-id">ID: {bookingHistoryModal.customer_code}</span>
                    <span className="bh-meta-dot">·</span>
                    <span className={`bh-status-pill ${(bookingHistoryModal.status || "active").toLowerCase()}`}>{(bookingHistoryModal.status || "active").toUpperCase()}</span>
                    <span className="bh-meta-dot">·</span>
                    <span className="bh-meta-count">{profileDetail?.total_bookings ?? bookingHistoryModal.total_bookings ?? 0} total bookings</span>
                  </p>
                </div>
              </div>
              <button className="bh-close-btn" onClick={() => { setBookingHistoryModal(null); setProfileDetail(null); }}>✕</button>
            </div>

            {profileLoading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>Loading history…</div>
            ) : profileDetail && (
              <>
                <div className="bh-summary-strip">
                  <div className="bh-strip-card"><span className="bh-strip-label">TOTAL</span><span className="bh-strip-value neutral">{profileDetail.total_bookings ?? 0}</span></div>
                  <div className="bh-strip-divider" />
                  <div className="bh-strip-card"><span className="bh-strip-label">COMPLETED</span><span className="bh-strip-value green">{profileDetail.completed_bookings ?? 0}</span></div>
                  <div className="bh-strip-divider" />
                  <div className="bh-strip-card"><span className="bh-strip-label">CANCELLED</span><span className="bh-strip-value red">{profileDetail.cancelled_bookings ?? 0}</span></div>
                  <div className="bh-strip-divider" />
                  <div className="bh-strip-card"><span className="bh-strip-label">ACTIVE NOW</span><span className="bh-strip-value blue">{profileDetail.active_now ?? 0}</span></div>
                </div>
                <div className="bh-body">
                  <h4 className="bh-section-label">BOOKING HISTORY</h4>
                  <div className="bh-timeline">
                    {(profileDetail.recent_bookings || []).map((b, idx) => {
                      const dotClass = b.status === "cancelled" ? "red" : b.status === "delivered" ? "green" : "blue";
                      return (
                        <div className="bh-timeline-item" key={b.shipment_code}>
                          <div className="bh-timeline-left">
                            <div className={`bh-dot ${dotClass}`}></div>
                            {idx < (profileDetail.recent_bookings.length - 1) && <div className="bh-line" />}
                          </div>
                          <div className="bh-timeline-card">
                            <div className="bh-card-top">
                              <div className="bh-card-id-route">
                                <span className="bh-card-id">{b.shipment_code}</span>
                                <span className="bh-card-route">{b.origin} → {b.destination}</span>
                              </div>
                              <span className="bh-card-date">{formatDate(b.created_at)}</span>
                            </div>
                            <div className="bh-card-bottom">
                              <span className="bh-cargo-tag">{b.cargo_type || "General Cargo"}</span>
                              <span className={`bh-booking-status ${b.status}`}>{b.status}</span>
                              {b.delivered_at && <span className="bh-delivered-tag">Delivered: {formatDate(b.delivered_at)}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!(profileDetail.recent_bookings?.length) && (
                      <p style={{ color: "#64748b", textAlign: "center", padding: "20px" }}>No booking history available.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}