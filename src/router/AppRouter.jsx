import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

import Login from "../pages/Login/login";
import Dashboard from "../pages/Dashboard/dashboard";
import Shipment from "../pages/Shipment/shipment";
import Fleet from "../pages/Fleet/fleet";
import Customer from "../pages/Customer/customer";
import Compliance from "../pages/Compliance/compliance";
// Reports
import Overview from "../pages/Report/Overview/overview";
import ShipmentReport from "../pages/Report/ShipmentReport/shipmentReport";
import DriverReport from "../pages/Report/DriverReport/driverReport";
import RevenueReport from "../pages/Report/RevenueReport/revenueReport";
// Settings
import Account from "../pages/Settings/Account/account";
import Notifications from "../pages/Settings/Notification/notification";
import Pricing from "../pages/Settings/Pricing/pricing";
import ComplianceThresholds from "../pages/Settings/ComplianceThreshold/complianceThreshold";
import UserManagement from "../pages/Settings/UserManagement/userManagement";
import Security from "../pages/Settings/Security/security";

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<P><Dashboard /></P>} />
        <Route path="/shipment" element={<P><Shipment /></P>} />
        <Route path="/fleet" element={<P><Fleet /></P>} />
        <Route path="/customer" element={<P><Customer /></P>} />
        <Route path="/compliance" element={<P><Compliance /></P>} />
        <Route path="/Report/overview" element={<P><Overview /></P>} />
        <Route path="/Report/shipmentReport" element={<P><ShipmentReport /></P>} />
        <Route path="/Report/driverReport" element={<P><DriverReport /></P>} />
        <Route path="/Report/revenueReport" element={<P><RevenueReport /></P>} />
        <Route path="/Settings/account" element={<P><Account /></P>} />
        <Route path="/Settings/notification" element={<P><Notifications /></P>} />
        <Route path="/Settings/pricing" element={<P><Pricing /></P>} />
        <Route path="/Settings/complianceThreshold" element={<P><ComplianceThresholds /></P>} />
        <Route path="/Settings/userManagement" element={<P><UserManagement /></P>} />
        <Route path="/Settings/security" element={<P><Security /></P>} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;
