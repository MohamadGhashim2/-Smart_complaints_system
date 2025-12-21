import { Navigate } from "react-router-dom";
import { getAccess } from "./auth";

export default function ProtectedRoute({ children }) {
  const token = getAccess();
  if (!token) return <Navigate to="/" replace />;
  return children;
}
