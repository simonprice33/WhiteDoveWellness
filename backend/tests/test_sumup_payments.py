"""
Backend tests for SumUp payment integration + public payment flow.
Leaves the app in 'not configured' state at the end.
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"

FAKE_KEY = "sup_sk_fake1234"
FAKE_MERCHANT = "MTEST123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/admin/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    tok = data.get("token") or data.get("access_token") or (data.get("data") or {}).get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def a_price_id():
    r = requests.get(f"{API}/prices", timeout=15)
    assert r.status_code == 200
    data = r.json()
    prices = data.get("prices") or data.get("data") or data
    if isinstance(prices, dict):
        prices = prices.get("prices", [])
    assert len(prices) > 0
    return prices[0]["id"]


def _future_weekday(min_days=3):
    """Find a future enabled working day; prefer Thursday since prod settings may disable other days."""
    d = datetime.utcnow() + timedelta(days=min_days)
    # Target Thursday (weekday==3) which is enabled with 'both' location
    while d.weekday() != 3:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


# --------- 1. Not-configured state ---------
class TestNotConfigured:
    def test_bookings_settings_shows_online_payments_configured_false(self):
        r = requests.get(f"{API}/bookings/settings", timeout=15)
        assert r.status_code == 200
        s = r.json()["settings"]
        assert "online_payments_configured" in s
        assert s["online_payments_configured"] is False
        assert "require_online_payment" in s

    def test_admin_get_config_masked_defaults(self, headers):
        r = requests.get(f"{API}/admin/payments/sumup/config", headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json().get("config") or r.json()
        assert c.get("api_key") == ""
        assert c.get("api_key_set") is False
        assert c.get("merchant_code") == ""
        assert c.get("currency") == "GBP"
        assert c.get("configured") is False

    def test_test_connection_not_configured(self, headers):
        r = requests.post(f"{API}/admin/payments/sumup/test", headers=headers, json={}, timeout=15)
        assert r.status_code == 400
        txt = (r.json().get("message") or r.json().get("error") or "").lower()
        assert "save" in txt or "merchant" in txt or "api key" in txt


# --------- 2. Save config, idempotent key, errors ---------
class TestSaveConfig:
    def test_save_missing_merchant_code(self, headers):
        r = requests.post(f"{API}/admin/payments/sumup/config", headers=headers,
                          json={"api_key": FAKE_KEY, "currency": "gbp"}, timeout=15)
        assert r.status_code == 400

    def test_save_no_key_no_existing(self, headers):
        r = requests.post(f"{API}/admin/payments/sumup/config", headers=headers,
                          json={"merchant_code": FAKE_MERCHANT, "currency": "gbp"}, timeout=15)
        assert r.status_code == 400

    def test_save_valid_config(self, headers):
        r = requests.post(f"{API}/admin/payments/sumup/config", headers=headers,
                          json={"api_key": FAKE_KEY, "merchant_code": FAKE_MERCHANT, "currency": "gbp"}, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json().get("config") or r.json()
        # masked api_key returns bullets
        assert "•" in (c.get("api_key") or "")
        assert c.get("api_key_hint", "").endswith("1234")
        assert c.get("currency") == "GBP"
        assert c.get("configured") is True

    def test_save_keeps_existing_key_when_masked(self, headers):
        # resend with masked value - should preserve key
        r = requests.post(f"{API}/admin/payments/sumup/config", headers=headers,
                          json={"api_key": "••••••••", "merchant_code": FAKE_MERCHANT, "currency": "GBP"}, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json().get("config") or r.json()
        assert c.get("api_key_set") is True
        assert c.get("configured") is True

    def test_bookings_settings_shows_configured_true(self):
        r = requests.get(f"{API}/bookings/settings", timeout=15)
        assert r.status_code == 200
        s = r.json()["settings"]
        assert s["online_payments_configured"] is True

    def test_test_connection_rejects_fake_key(self, headers):
        r = requests.post(f"{API}/admin/payments/sumup/test", headers=headers, json={}, timeout=15)
        assert r.status_code == 400, r.text
        msg = (r.json().get("message") or r.json().get("error") or "").lower()
        assert "sumup" in msg and ("reject" in msg or "api key" in msg or "invalid" in msg)


# --------- 3. Public payments with/without require_online_payment ---------
class TestPublicPaymentFlow:
    booking_id_no_payment = None
    booking_id_payment = None

    def _create_public_booking(self, a_price_id, extra=None):
        import random
        payload = {
            "price_id": a_price_id,
            "booking_date": _future_weekday(5),
            "booking_time": f"{random.randint(9,15):02d}:{random.choice(['00','30'])}",
            "first_name": "TEST",
            "last_name": "Payment",
            "client_email": f"test_pay_{datetime.utcnow().timestamp()}@example.com",
            "client_phone": "555-5555",
            "is_home_visit": False,
        }
        if extra:
            payload.update(extra)
        r = requests.post(f"{API}/bookings/create", json=payload, timeout=20)
        return r

    def test_create_booking_without_payment_required(self, a_price_id):
        # require_online_payment is false (not toggled yet)
        r = self._create_public_booking(a_price_id)
        assert r.status_code in (200, 201), r.text
        data = r.json()
        b = data.get("booking") or data
        assert b["status"] == "pending_confirmation"
        assert b.get("payment_provider") in (None, "")
        TestPublicPaymentFlow.booking_id_no_payment = b["id"]

    def test_checkout_for_non_payment_booking_400(self):
        bid = TestPublicPaymentFlow.booking_id_no_payment
        assert bid
        r = requests.post(f"{API}/payments/checkout", json={"booking_id": bid}, timeout=15)
        assert r.status_code == 400, r.text
        msg = (r.json().get("message") or r.json().get("error") or "").lower()
        assert "online payment" in msg or "does not require" in msg

    def test_checkout_unknown_booking_404(self):
        r = requests.post(f"{API}/payments/checkout", json={"booking_id": "nope"}, timeout=15)
        assert r.status_code == 404

    def test_get_status_known_booking(self):
        bid = TestPublicPaymentFlow.booking_id_no_payment
        r = requests.get(f"{API}/payments/status/{bid}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("success") is True
        assert "checkout_status" in data
        b = data.get("booking")
        assert b and b.get("id") == bid
        assert "_id" not in b

    def test_get_status_unknown(self):
        r = requests.get(f"{API}/payments/status/nope-xxxxx", timeout=15)
        assert r.status_code == 404


# --------- 4. Enable require_online_payment, test payment-required booking ---------
class TestRequireOnlinePayment:
    booking_id = None
    original_settings = None

    def test_enable_require_online_payment(self, headers):
        cur = requests.get(f"{API}/settings", timeout=15)
        assert cur.status_code == 200
        current = cur.json().get("settings") or cur.json()
        TestRequireOnlinePayment.original_settings = current

        bs = dict(current.get("booking_settings") or {})
        bs["enabled"] = True
        bs["require_online_payment"] = True
        payload = dict(current)
        payload.pop("_id", None)
        payload["booking_settings"] = bs
        r = requests.put(f"{API}/admin/settings", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text

        s = requests.get(f"{API}/bookings/settings", timeout=15).json()["settings"]
        assert s["require_online_payment"] is True
        assert s["online_payments_configured"] is True

    def test_booking_requires_payment(self, a_price_id):
        import random
        payload = {
            "price_id": a_price_id,
            "booking_date": _future_weekday(14),
            "booking_time": f"{random.randint(9,15):02d}:{random.choice(['00','30'])}",
            "first_name": "TEST",
            "last_name": "PayReq",
            "client_email": f"test_payreq_{datetime.utcnow().timestamp()}@example.com",
            "client_phone": "555-6666",
            "is_home_visit": False,
        }
        r = requests.post(f"{API}/bookings/create", json=payload, timeout=20)
        assert r.status_code in (200, 201), r.text
        b = r.json().get("booking") or r.json()
        assert b["status"] == "pending_payment"
        TestRequireOnlinePayment.booking_id = b["id"]

    def test_checkout_fails_with_fake_key(self):
        bid = TestRequireOnlinePayment.booking_id
        assert bid
        r = requests.post(f"{API}/payments/checkout", json={"booking_id": bid}, timeout=30)
        # SumUp will reject fake key - expect 502 friendly error
        assert r.status_code == 502, r.text
        try:
            msg = (r.json().get("message") or r.json().get("error") or "")
            assert len(msg) > 0
        except Exception:
            pass

    def test_restore_require_online_payment_false(self, headers):
        # cleanup created bookings
        for bid in [TestRequireOnlinePayment.booking_id, TestPublicPaymentFlow.booking_id_no_payment]:
            if bid:
                try:
                    requests.delete(f"{API}/admin/bookings/{bid}", headers=headers, timeout=15)
                except Exception:
                    pass
        current = TestRequireOnlinePayment.original_settings or {}
        bs = dict(current.get("booking_settings") or {})
        bs["require_online_payment"] = False
        payload = dict(current)
        payload.pop("_id", None)
        payload["booking_settings"] = bs
        r = requests.put(f"{API}/admin/settings", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text


# --------- 5. Webhook ---------
class TestWebhook:
    def test_empty_body(self):
        r = requests.post(f"{API}/payments/sumup/webhook", json={}, timeout=15)
        assert r.status_code == 400

    def test_other_event_type(self):
        r = requests.post(f"{API}/payments/sumup/webhook", json={"event_type": "OTHER", "id": "x"}, timeout=15)
        assert r.status_code == 204

    def test_checkout_status_changed_unknown(self):
        r = requests.post(f"{API}/payments/sumup/webhook",
                          json={"event_type": "CHECKOUT_STATUS_CHANGED", "id": "unknown"}, timeout=15)
        assert r.status_code == 204

    def test_old_public_confirm_route_removed(self):
        r = requests.post(f"{API}/bookings/some-id/confirm", json={}, timeout=15)
        assert r.status_code == 404


# --------- 6. Admin PUT status accepts pending_confirmation ---------
class TestAdminStatusPendingConfirmation:
    def test_update_status_to_pending_confirmation(self, headers, a_price_id):
        # create a booking via admin
        d = _future_weekday(28)
        r = requests.post(f"{API}/admin/bookings/create", headers=headers, json={
            "new_client": {
                "first_name": "TESTSt", "last_name": "Us",
                "email": f"test_st_{datetime.utcnow().timestamp()}@example.com",
                "phone": "555-7777"
            },
            "price_id": a_price_id,
            "booking_date": d,
            "booking_time": "10:00",
            "is_home_visit": False,
            "status": "confirmed"
        }, timeout=15)
        assert r.status_code == 201, r.text
        booking_id = r.json()["booking"]["id"]
        client_id = r.json()["client"]["id"]

        # change to pending_confirmation
        r2 = requests.put(f"{API}/admin/bookings/{booking_id}/status", headers=headers,
                          json={"status": "pending_confirmation"}, timeout=15)
        assert r2.status_code == 200, r2.text

        # cleanup
        requests.delete(f"{API}/admin/bookings/{booking_id}", headers=headers, timeout=15)
        requests.delete(f"{API}/admin/clients/{client_id}", headers=headers, timeout=15)


# --------- 7. Disconnect - leave app in not-configured state ---------
class TestDisconnect:
    def test_disconnect(self, headers):
        r = requests.post(f"{API}/admin/payments/sumup/disconnect", headers=headers, timeout=15)
        assert r.status_code == 200, r.text

    def test_config_after_disconnect(self, headers):
        r = requests.get(f"{API}/admin/payments/sumup/config", headers=headers, timeout=15)
        c = r.json().get("config") or r.json()
        assert c.get("configured") is False
        assert c.get("api_key_set") is False

    def test_bookings_settings_online_payments_false(self):
        s = requests.get(f"{API}/bookings/settings", timeout=15).json()["settings"]
        assert s["online_payments_configured"] is False
