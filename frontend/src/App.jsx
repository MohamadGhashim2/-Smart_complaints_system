// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewComplaint from "./pages/NewComplaint";
import ComplaintDetail from "./pages/ComplaintDetail";
import Departments from "./pages/Departments";
import UsersManagement from "./pages/UsersManagement";
import SystemSettings from "./pages/SystemSettings";
import Register from "./pages/Register"; // ✅ صفحة التسجيل

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} /> {/* ✅ */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new" element={<NewComplaint />} />
        <Route path="/complaints/:id" element={<ComplaintDetail />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/ai-settings" element={<SystemSettings />} />
      </Routes>
    </BrowserRouter>
  );
}
