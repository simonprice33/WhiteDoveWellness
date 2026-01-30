import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { publicApi } from '../../lib/api';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { AlertCircle, LogIn } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/images/logo.png');

  useEffect(() => {
    publicApi.getSettings().then(res => {
      if (res.data.settings?.images?.logo_url) {
        setLogoUrl(res.data.settings.images.logo_url);
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #F5F3FA 0%, #FAFAF9 100%)'
      }}
      data-testid="admin-login-page"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={logoUrl}
            alt="White Dove Wellness"
            className="h-24 mx-auto mb-4"
          />
          <h1 className="font-serif text-2xl text-slate-800">Admin Login</h1>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-8 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]"
          data-testid="admin-login-form"
        >
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 text-red-600 rounded-xl" data-testid="login-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="admin"
                className="bg-slate-50 border-slate-200 focus:border-[#9F87C4] focus:ring-[#9F87C4]/20"
                data-testid="login-username-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-slate-50 border-slate-200 focus:border-[#9F87C4] focus:ring-[#9F87C4]/20"
                data-testid="login-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#9F87C4] hover:bg-[#8A6EB5] text-white rounded-xl py-5 font-medium"
              data-testid="login-submit-btn"
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In
                  <LogIn size={18} className="ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Back to site */}
        <p className="text-center mt-6">
          <a href="/" className="text-[#9F87C4] hover:text-[#8A6EB5] text-sm">
            ← Back to website
          </a>
        </p>
      </div>
    </div>
  );
}
