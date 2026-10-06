import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { adminApi } from '../../../lib/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { CreditCard, Save, RefreshCw, Unlink, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const MASK = '••••••••';

export const SumUpPaymentsSection = () => {
  const [config, setConfig] = useState({ api_key: '', merchant_code: '', currency: 'GBP' });
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const response = await adminApi.getSumUpConfig();
      const data = response.data.config;
      setStatus(data);
      setConfig({
        api_key: data.api_key_set ? MASK : '',
        merchant_code: data.merchant_code || '',
        currency: data.currency || 'GBP'
      });
    } catch (error) {
      console.error('Failed to load SumUp config:', error);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await adminApi.saveSumUpConfig(config);
      toast.success('SumUp configuration saved');
      loadConfig();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save SumUp configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await adminApi.testSumUp();
      const name = response.data.business_name ? ` (${response.data.business_name})` : '';
      toast.success(`Connected to SumUp${name}`);
      loadConfig();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const disconnect = async () => {
    if (!confirm('Remove the SumUp connection? Customers will no longer be able to pay online.')) return;
    try {
      await adminApi.disconnectSumUp();
      toast.success('SumUp disconnected');
      loadConfig();
    } catch (error) {
      toast.error('Failed to disconnect SumUp');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6" data-testid="sumup-payments-section">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-[#F5F3FA] rounded-lg">
          <CreditCard size={20} className="text-[#9F87C4]" />
        </div>
        <div className="flex-1">
          <h2 className="font-serif text-xl text-slate-800">SumUp Online Payments</h2>
          <p className="text-sm text-slate-500">Take card payments for bookings through SumUp's secure checkout page</p>
        </div>
        <RouterLink to="/admin/help#sumup" className="text-sm text-[#9F87C4] hover:underline flex items-center gap-1" data-testid="sumup-help-link">
          <HelpCircle size={16} /> Setup guide
        </RouterLink>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50" data-testid="sumup-status">
        {status?.configured ? (
          <>
            <CheckCircle className={status.last_verified_at ? 'text-green-500' : 'text-amber-500'} size={24} />
            <div className="flex-1">
              <p className={`font-medium ${status.last_verified_at ? 'text-green-700' : 'text-amber-700'}`}>
                {status.last_verified_at ? 'Connected' : 'Configured - not yet verified'}
              </p>
              <p className="text-sm text-slate-600">
                Merchant {status.merchant_code} · API key {status.api_key_hint}
                {status.verified_business_name ? ` · ${status.verified_business_name}` : ''}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={testConnection} disabled={testing} className="mr-2" data-testid="sumup-test-btn">
              <RefreshCw size={16} className={`mr-1 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Testing...' : 'Test connection'}
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={disconnect} data-testid="sumup-disconnect-btn">
              <Unlink size={16} className="mr-1" />
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <AlertCircle className="text-slate-400" size={24} />
            <div className="flex-1">
              <p className="font-medium text-slate-600">Not configured</p>
              <p className="text-sm text-slate-500">Add your SumUp API key and merchant code below. Until then, bookings are taken as requests and you arrange payment directly.</p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-slate-700">SumUp Credentials</h3>
        <p className="text-xs text-slate-500">
          Create a secret API key in your{' '}
          <a href="https://me.sumup.com/developers" target="_blank" rel="noopener noreferrer" className="text-[#9F87C4] hover:underline">
            SumUp dashboard
          </a>{' '}
          (Settings → For developers → API keys). Your merchant code is shown on the same page.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Secret API Key</label>
            <Input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="sup_sk_..."
              data-testid="sumup-api-key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Merchant Code</label>
            <Input
              value={config.merchant_code}
              onChange={(e) => setConfig({ ...config, merchant_code: e.target.value })}
              placeholder="MXXXXXXX"
              data-testid="sumup-merchant-code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <Input
              value={config.currency}
              onChange={(e) => setConfig({ ...config, currency: e.target.value.toUpperCase() })}
              placeholder="GBP"
              maxLength={3}
              data-testid="sumup-currency"
            />
            <p className="text-xs text-slate-500 mt-1">Must match your SumUp account currency</p>
          </div>
        </div>

        <Button
          type="button"
          onClick={saveConfig}
          disabled={saving || !config.merchant_code || !config.api_key}
          variant="outline"
          data-testid="sumup-save-btn"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save SumUp Configuration'}
        </Button>
      </div>
    </div>
  );
};
