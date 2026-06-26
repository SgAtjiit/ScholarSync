import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Layout from "./components/layout/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import APIKeySetup from "./pages/APIKeySetup";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Profile from "./pages/Profile";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import React, { useEffect, useRef } from "react";
import { Toaster, toast } from "react-hot-toast"; // ✨ ADDED: toast import
import { hasKeysSaved } from "./utils/keyManager";

// ✨ MODIFIED: ProtectedRoute with Login Alert
const ProtectedRoute = ({ children, requireKeys = true }) => {
  const { user, loading } = useAuth();
  const hasShownAuthToastRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user && !hasShownAuthToastRef.current) {
      hasShownAuthToastRef.current = true;
      toast.dismiss("auth-error");
      toast.error("Please login to access the Dashboard.", {
        id: "auth-error",
      });
      return;
    }

    if (user) {
      hasShownAuthToastRef.current = false;
      toast.dismiss("auth-error");
    }
  }, [user, loading]);

  if (loading)
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#09090b] text-zinc-500">
        Initializing ScholarSync...
      </div>
    );

  if (!user) return <Navigate to="/login" />;

  // Enforce API key configuration if required
  if (requireKeys && !hasKeysSaved()) {
    toast.error("Please set up your API keys to access ScholarSync features.");
    return <Navigate to="/api-key-setup" />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Toaster
          position="top-center"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 5000,
            style: {
              background: '#0c0a09',
              color: '#f5f5f4',
              border: '1px solid #292524',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'Inter, system-ui, sans-serif',
              maxWidth: '450px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            },
            success: {
              duration: 4000,
              style: {
                border: '1px solid #16a34a',
                background: '#052e16',
                color: '#f0fdf4',
              },
              iconTheme: {
                primary: '#22c55e',
                secondary: '#052e16',
              },
            },
            error: {
              duration: 6000,
              style: {
                border: '1px solid #dc2626',
                background: '#450a0a',
                color: '#fef2f2',
              },
              iconTheme: {
                primary: '#ef4444',
                secondary: '#450a0a',
              },
            },
          }}
        />

        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/api-key-setup"
            element={
              <ProtectedRoute requireKeys={false}>
                <APIKeySetup />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireKeys={true}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute requireKeys={false}>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="/workspace/:assignmentId" element={ 
              <ProtectedRoute requireKeys={true}> 
               <Workspace />
              </ProtectedRoute>
            } />
        </Routes>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;


