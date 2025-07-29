import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import TeamManagement from "./pages/TeamManagement";
import { ADMIN_EMAILS } from "./constants/userRoles";
import ProsConsManager from './pages/ProsConsManager';

export default function App() {
  const [user, setUser] = useState(null);
  const [memberList, setMemberList] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/members`)
      .then((res) => res.json())
      .then((data) => setMemberList(data))
      .catch((err) => console.error("Error loading member list", err));
  }, []);

  const handleLoginSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    const email = decoded.email;

    // Check if this email exists in the DB
    const matchedUser = memberList.find((m) => m.email === email);

    if (ADMIN_EMAILS.includes(email)) {
      setUser({ ...decoded, name: decoded.name, role: "admin" });
    } else if (matchedUser) {
      setUser({
        ...decoded,
        name: matchedUser.name, // ✅ Use name from DB
        role: "user",
        project: matchedUser.project,
      });
    } else {
      setUser({ ...decoded, name: decoded.name, role: "unknown" });
    }
  };

  return (
    <Router>
      {!user ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-white">
          <div className="bg-white p-8 rounded-xl shadow-lg w-[350px] text-center">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Titan TalkIQ Login</h1>
            <p className="mb-6 text-gray-500">Sign in with your Google account</p>
            <GoogleLogin onSuccess={handleLoginSuccess} onError={() => console.log("Login Failed")} />
          </div>
        </div>
      ) : (
        <Routes>
          <Route
            path="/"
            element={
              user.role === "admin" ? (
                <Navigate to="/admin" />
              ) : user.role === "user" ? (
                <Navigate to="/user" />
              ) : (
                <div className="text-center mt-20 text-red-600 text-xl font-semibold">
                  Access Denied: You are not authorized.
                </div>
              )
            }
          />
          <Route path="/admin" element={<AdminDashboard user={user} />} />
          <Route path="/admin/team-management" element={<TeamManagement user={user} />} />
          <Route path="/user" element={<UserDashboard user={user} />} />
          <Route path="/admin/pros-cons" element={<ProsConsManager />} />
        </Routes>
      )}
    </Router>
  );
}
