/**
 * SumUp Service
 * Credentials are stored in the database (siteSettings.sumup_config) so the
 * client can manage them from the admin panel.
 */

const SUMUP_API = 'https://api.sumup.com/v0.1';
const MASK = '••••••••';

class SumUpService {
  constructor(collections) {
    this.collections = collections;
  }

  async getConfig() {
    const settings = await this.collections.siteSettings.findOne(
      { id: 'site_settings' },
      { projection: { sumup_config: 1 } }
    );
    return settings?.sumup_config || null;
  }

  async isConfigured() {
    const config = await this.getConfig();
    return !!(config?.api_key && config?.merchant_code);
  }

  async saveConfig({ api_key, merchant_code, currency }) {
    await this.collections.siteSettings.updateOne(
      { id: 'site_settings' },
      {
        $set: {
          sumup_config: {
            api_key,
            merchant_code: merchant_code.trim(),
            currency: (currency || 'GBP').toUpperCase(),
            updated_at: new Date().toISOString()
          }
        }
      },
      { upsert: true }
    );
  }

  async clearConfig() {
    await this.collections.siteSettings.updateOne(
      { id: 'site_settings' },
      { $unset: { sumup_config: '' } }
    );
  }

  async getFullConfig() {
    const config = (await this.getConfig()) || {};
    return {
      api_key: config.api_key ? MASK : '',
      api_key_set: !!config.api_key,
      api_key_hint: config.api_key ? `…${config.api_key.slice(-4)}` : '',
      merchant_code: config.merchant_code || '',
      currency: config.currency || 'GBP',
      configured: !!(config.api_key && config.merchant_code),
      last_verified_at: config.last_verified_at || null,
      verified_business_name: config.verified_business_name || null,
      updated_at: config.updated_at || null
    };
  }

  async request(method, path, body) {
    const config = await this.getConfig();
    if (!config?.api_key) {
      throw new Error('SumUp is not configured');
    }

    const response = await fetch(`${SUMUP_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const message = data?.message || data?.error_message || data?.detail || `SumUp API error (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Verify the API key works and (where possible) matches the merchant code
  async testConnection() {
    const config = await this.getConfig();
    let profile = null;

    try {
      profile = await this.request('GET', '/me');
    } catch (error) {
      if (error.status !== 401) {
        // Key may lack profile scope - fall back to a payments-scope call
        await this.request('GET', '/checkouts?checkout_reference=wdw-connection-test');
      } else {
        throw new Error('SumUp rejected the API key. Check it was copied correctly (use the secret API key, not the public key).');
      }
    }

    const liveMerchantCode = profile?.merchant_profile?.merchant_code || null;
    const businessName = profile?.merchant_profile?.company_name
      || profile?.merchant_profile?.legal_name
      || null;

    if (liveMerchantCode && liveMerchantCode !== config.merchant_code) {
      throw new Error(`API key belongs to merchant ${liveMerchantCode}, but merchant code ${config.merchant_code} is saved. Please correct the merchant code.`);
    }

    await this.collections.siteSettings.updateOne(
      { id: 'site_settings' },
      {
        $set: {
          'sumup_config.last_verified_at': new Date().toISOString(),
          'sumup_config.verified_business_name': businessName
        }
      }
    );

    return { merchant_code: liveMerchantCode || config.merchant_code, business_name: businessName };
  }

  async createCheckout({ booking, baseUrl }) {
    const config = await this.getConfig();
    const reference = `WDW-${booking.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36)}`;

    const checkout = await this.request('POST', '/checkouts', {
      checkout_reference: reference,
      amount: Number(booking.price_amount.toFixed(2)),
      currency: config.currency || 'GBP',
      merchant_code: config.merchant_code,
      description: `${booking.therapy_name} - ${booking.price_name} (${booking.booking_date})`,
      return_url: `${baseUrl}/api/payments/sumup/webhook`,
      redirect_url: `${baseUrl}/booking/return?booking_id=${encodeURIComponent(booking.id)}`,
      hosted_checkout: { enabled: true }
    });

    return { ...checkout, checkout_reference: reference };
  }

  async getCheckout(checkoutId) {
    return this.request('GET', `/checkouts/${encodeURIComponent(checkoutId)}`);
  }
}

module.exports = SumUpService;
