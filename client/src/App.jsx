import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Layout from "./components/layout/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import React, { useEffect } from "react"; // ✨ ADDED: useEffect import
import { Toaster, toast } from 'react-hot-toast'; // ✨ ADDED: toast import

// ✨ MODIFIED: ProtectedRoute with Login Alert
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Jab koi bina login kiye access karega toh ye message aayega
      toast.error(" Please login to access the Dashboard.", {
        id: 'auth-error', // ID prevents duplicate toasts
      });
    }
  }, [user, loading]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-[#09090b] text-zinc-500">Initializing ScholarSync...</div>;

  if (!user) return <Navigate to="/login" />;

  return <Layout>{children}</Layout>;
};

function App() {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#18181b',
              color: '#fff',
              border: '1px solid #27272a',
            },
            success: {
              iconTheme: {
                primary: '#4f46e5',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/workspace/:assignmentId" element={
            <ProtectedRoute>
              <Workspace />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;