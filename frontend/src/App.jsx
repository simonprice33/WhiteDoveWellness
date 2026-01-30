import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Toaster } from './components/ui/sonner';

// Public Pages
import HomePage from './pages/HomePage';
import PolicyPage from './pages/PolicyPage';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTherapies from './pages/admin/AdminTherapies';
import AdminPrices from './pages/admin/AdminPrices';
import AdminContacts from './pages/admin/AdminContacts';
import AdminClients from './pages/admin/AdminClients';
import AdminAffiliations from './pages/admin/AdminAffiliations';
import AdminPolicies from './pages/admin/AdminPolicies';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#9F87C4]/20 border-t-[#9F87C4] animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/policy/:slug" element={<PolicyPage />} />
          
          {/* Admin Login */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="therapies" element={<AdminTherapies />} />
            <Route path="prices" element={<AdminPrices />} />
            <Route path="contacts" element={<AdminContacts />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="affiliations" element={<AdminAffiliations />} />
            <Route path="policies" element={<AdminPolicies />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
