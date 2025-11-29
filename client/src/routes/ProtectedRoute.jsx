import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import React, { useEffect } from "react"; // ✨ ADDED: useEffect import
import { Toaster, toast } from 'react-hot-toast'; // ✨ ADDED: toast import

// ✨ MODIFIED: ProtectedRoute with Login Alert
const ProtectedRoute = () => {
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
  
  return;
};

