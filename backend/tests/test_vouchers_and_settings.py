"""
Tests for Gift Vouchers backend:
- Public GET /api/settings exposes gift_voucher_settings and strips secrets
- Admin PUT /api/admin/settings persists gift_voucher_settings
- Admin CRUD /api/admin/vouchers (create, list, update, redeem, delete)
"""
import os
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wellness-preview-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEFAULT_TITLE = "Give the Gift of Relaxation"
DEFAULT_AMOUNTS = [30, 50, 75]
SUMUP_LINK = "https://giftcards.sumup.com/order/MA1423Z9"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/admin/auth/login", json={"username": "admin", "password": "admin123"}, timeout=20)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def auth(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# -------------- Public settings --------------

class TestPublicSettings:
    def test_public_settings_has_voucher_defaults_and_no_secrets(self):
        r = requests.get(f"{API}/settings", timeout=20)
        assert r.status_code == 200
        body = r.json()
        s = body["settings"]
        gv = s.get("gift_voucher_settings")
        assert gv is not None
        assert gv["enabled"] is True
        assert gv["sumup_link"] == SUMUP_LINK
        assert isinstance(gv["amounts"], list) and len(gv["amounts"]) >= 1
        assert gv["allow_custom_amount"] is True
        assert isinstance(gv["how_it_works"], list) and len(gv["how_it_works"]) == 3
        assert "small_print" in gv and isinstance(gv["small_print"], str)
        assert "button_text" in gv
        # Secrets must be stripped
        for secret in ("sumup_config", "google_calendar_config", "google_calendar"):
            assert secret not in s, f"Secret {secret} leaked in public settings"


# -------------- Admin settings update --------------

class TestAdminSettingsUpdate:
    def test_update_gift_voucher_settings_and_restore(self, auth):
        new_gv = {
            "enabled": True,
            "title": "QA Voucher Title",
            "subtitle": "QA sub",
            "amounts": [25, 40],
            "allow_custom_amount": True,
            "sumup_link": SUMUP_LINK,
            "button_text": "Buy a Gift Voucher",
            "how_it_works": ["a", "b", "c"],
            "small_print": "qa",
        }
        r = requests.put(f"{API}/admin/settings", json={"gift_voucher_settings": new_gv}, headers=auth, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        s = body["settings"]
        assert s["gift_voucher_settings"]["title"] == "QA Voucher Title"
        assert s["gift_voucher_settings"]["amounts"] == [25, 40]
        for secret in ("sumup_config", "google_calendar_config", "google_calendar"):
            assert secret not in s

        # GET reflects it
        r2 = requests.get(f"{API}/settings", timeout=20)
        assert r2.status_code == 200
        gv2 = r2.json()["settings"]["gift_voucher_settings"]
        assert gv2["title"] == "QA Voucher Title"
        assert gv2["amounts"] == [25, 40]

        # Restore
        restore = {
            "enabled": True,
            "title": DEFAULT_TITLE,
            "subtitle": "Treat someone special to a moment of calm with a White Dove Wellness gift voucher.",
            "amounts": DEFAULT_AMOUNTS,
            "allow_custom_amount": True,
            "sumup_link": SUMUP_LINK,
            "button_text": "Buy a Gift Voucher",
            "how_it_works": [
                "Choose an amount and pay securely through SumUp.",
                "The voucher is emailed instantly - to you or straight to the recipient.",
                "Bring the voucher code to the appointment to redeem it against any treatment.",
            ],
            "small_print": "Vouchers are valid for 12 months from purchase and can be used towards any treatment.",
        }
        r3 = requests.put(f"{API}/admin/settings", json={"gift_voucher_settings": restore}, headers=auth, timeout=20)
        assert r3.status_code == 200
        assert r3.json()["settings"]["gift_voucher_settings"]["title"] == DEFAULT_TITLE


# -------------- Vouchers CRUD --------------

CREATED_IDS = []


def _delete_voucher(auth, vid):
    try:
        requests.delete(f"{API}/admin/vouchers/{vid}", headers=auth, timeout=20)
    except Exception:
        pass


class TestVouchers:
    @pytest.fixture(autouse=True, scope="class")
    def cleanup(self, auth):
        yield
        for vid in list(CREATED_IDS):
            _delete_voucher(auth, vid)
        # Also sweep any remaining TEST_ vouchers
        r = requests.get(f"{API}/admin/vouchers", headers=auth, timeout=20)
        if r.status_code == 200:
            for v in r.json().get("vouchers", []):
                if v["code"].startswith("WDW-QA") or v["code"].startswith("WDW-UI") or v["code"].startswith("TEST"):
                    _delete_voucher(auth, v["id"])

    def test_create_voucher(self, auth):
        payload = {"code": "wdw-qa1", "amount": 50, "recipient_name": "Jane", "buyer_name": "Bob", "buyer_email": "bob@x.com"}
        r = requests.post(f"{API}/admin/vouchers", json=payload, headers=auth, timeout=20)
        assert r.status_code == 201, r.text
        v = r.json()["voucher"]
        CREATED_IDS.append(v["id"])
        assert v["code"] == "WDW-QA1"
        assert v["balance"] == 50
        assert v["status"] == "active"
        today = date.today().isoformat()
        assert v["purchased_at"] == today
        expected_exp = date.today().replace(year=date.today().year + 1).isoformat()
        assert v["expires_at"] == expected_exp

    def test_duplicate_code_409(self, auth):
        r = requests.post(f"{API}/admin/vouchers", json={"code": "WDW-QA1", "amount": 20}, headers=auth, timeout=20)
        assert r.status_code == 409
        # case-insensitive
        r2 = requests.post(f"{API}/admin/vouchers", json={"code": "wdw-qa1", "amount": 20}, headers=auth, timeout=20)
        assert r2.status_code == 409

    def test_missing_code_400(self, auth):
        r = requests.post(f"{API}/admin/vouchers", json={"amount": 10}, headers=auth, timeout=20)
        assert r.status_code == 400

    def test_zero_amount_400(self, auth):
        r = requests.post(f"{API}/admin/vouchers", json={"code": "WDW-QAZERO", "amount": 0}, headers=auth, timeout=20)
        assert r.status_code == 400

    def test_list_summary_and_filters(self, auth):
        r = requests.get(f"{API}/admin/vouchers", headers=auth, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert "vouchers" in body and "summary" in body
        s = body["summary"]
        for key in ("active", "redeemed", "expired", "cancelled", "outstanding_value"):
            assert key in s
        # search
        r2 = requests.get(f"{API}/admin/vouchers?search=jane", headers=auth, timeout=20)
        assert r2.status_code == 200
        codes = [v["code"] for v in r2.json()["vouchers"]]
        assert "WDW-QA1" in codes
        # status filter
        r3 = requests.get(f"{API}/admin/vouchers?status=active", headers=auth, timeout=20)
        assert r3.status_code == 200
        for v in r3.json()["vouchers"]:
            assert v["status"] == "active"

    def test_update_voucher_amount_follows_balance(self, auth):
        vid = CREATED_IDS[0]
        r = requests.put(f"{API}/admin/vouchers/{vid}", json={"notes": "x", "amount": 60}, headers=auth, timeout=20)
        assert r.status_code == 200
        v = r.json()["voucher"]
        assert v["amount"] == 60
        assert v["balance"] == 60
        assert v["notes"] == "x"

    def test_update_invalid_status_400(self, auth):
        vid = CREATED_IDS[0]
        r = requests.put(f"{API}/admin/vouchers/{vid}", json={"status": "bogus"}, headers=auth, timeout=20)
        assert r.status_code == 400

    def test_partial_redeem(self, auth):
        vid = CREATED_IDS[0]
        r = requests.put(f"{API}/admin/vouchers/{vid}/redeem", json={"amount_used": 20, "redeemed_by": "Jane"}, headers=auth, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        v = body["voucher"]
        assert v["status"] == "active"
        assert v["balance"] == 40  # was 60, -20
        assert "£40.00 remaining" in body["message"]
        assert len(v.get("redemptions", [])) == 1

    def test_over_redeem_400(self, auth):
        vid = CREATED_IDS[0]
        r = requests.put(f"{API}/admin/vouchers/{vid}/redeem", json={"amount_used": 999}, headers=auth, timeout=20)
        assert r.status_code == 400

    def test_full_redeem_then_already_redeemed(self, auth):
        vid = CREATED_IDS[0]
        # full remaining = 40
        r = requests.put(f"{API}/admin/vouchers/{vid}/redeem", json={}, headers=auth, timeout=20)
        assert r.status_code == 200, r.text
        v = r.json()["voucher"]
        assert v["status"] == "redeemed"
        assert v["balance"] == 0
        assert v["redeemed_at"]

        r2 = requests.put(f"{API}/admin/vouchers/{vid}/redeem", json={}, headers=auth, timeout=20)
        assert r2.status_code == 400
        assert "already" in r2.json().get("message", "").lower()

    def test_reactivate_voucher(self, auth):
        vid = CREATED_IDS[0]
        r = requests.put(f"{API}/admin/vouchers/{vid}", json={"status": "active"}, headers=auth, timeout=20)
        assert r.status_code == 200
        v = r.json()["voucher"]
        assert v["status"] == "active"
        assert v["redeemed_at"] is None

    def test_expired_voucher_detected(self, auth):
        past = (date.today() - timedelta(days=5)).isoformat()
        r = requests.post(f"{API}/admin/vouchers", json={"code": "WDW-QAEXP", "amount": 10, "expires_at": past}, headers=auth, timeout=20)
        assert r.status_code == 201
        vid = r.json()["voucher"]["id"]
        CREATED_IDS.append(vid)

        rl = requests.get(f"{API}/admin/vouchers", headers=auth, timeout=20)
        body = rl.json()
        found = next((v for v in body["vouchers"] if v["id"] == vid), None)
        assert found is not None
        assert found["status"] == "expired"
        assert body["summary"]["expired"] >= 1

    def test_delete_voucher(self, auth):
        # create a dedicated one
        r = requests.post(f"{API}/admin/vouchers", json={"code": "WDW-QADEL", "amount": 5}, headers=auth, timeout=20)
        assert r.status_code == 201
        vid = r.json()["voucher"]["id"]
        d = requests.delete(f"{API}/admin/vouchers/{vid}", headers=auth, timeout=20)
        assert d.status_code == 200
        d2 = requests.delete(f"{API}/admin/vouchers/{vid}", headers=auth, timeout=20)
        assert d2.status_code == 404
