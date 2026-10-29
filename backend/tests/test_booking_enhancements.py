"""
Backend tests for booking system enhancements:
- Upcoming appointments endpoint
- Admin booking creation
- Blocked times CRUD
- Availability with blocked times respect
- Booking settings (calendar_colors, remote_day_message)
- Per-day location settings in settings update
"""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wellness-preview-9.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "admin"
ADMIN_PASS = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/admin/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("token") or data.get("access_token") or (data.get("data") or {}).get("token")
    assert tok, f"No token in response: {data}"
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


# ---------- Booking settings (public) ----------
class TestBookingSettings:
    def test_get_public_booking_settings(self):
        r = requests.get(f"{API}/bookings/settings", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        s = data["settings"]
        assert "working_hours" in s
        assert "calendar_colors" in s
        cc = s["calendar_colors"]
        assert "fixed" in cc and "remote" in cc and "both" in cc
        assert "remote_day_message" in s


# ---------- Upcoming appointments ----------
class TestUpcomingAppointments:
    def test_upcoming_default_7_days(self, headers):
        r = requests.get(f"{API}/admin/bookings/upcoming", headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["days"] == 7
        assert "appointments_by_date" in data
        assert "total_appointments" in data
        assert "start_date" in data and "end_date" in data

    def test_upcoming_custom_days(self, headers):
        r = requests.get(f"{API}/admin/bookings/upcoming?days=14", headers=headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["days"] == 14


# ---------- Blocked times CRUD ----------
class TestBlockedTimesCRUD:
    created_ids = []

    def test_list_blocked_times(self, headers):
        r = requests.get(f"{API}/admin/blocked-times", headers=headers, timeout=15)
        assert r.status_code == 200
        assert "blocked_times" in r.json()

    def test_create_one_time_block(self, headers):
        future_date = (datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d")
        payload = {
            "date": future_date,
            "start_time": "10:00",
            "end_time": "11:30",
            "reason": "TEST_one_time_block",
            "is_recurring": False
        }
        r = requests.post(f"{API}/admin/blocked-times", headers=headers, json=payload, timeout=15)
        assert r.status_code == 201, r.text
        b = r.json()["blocked_time"]
        assert b["is_recurring"] is False
        assert b["date"] == future_date
        assert b["start_minutes"] == 600
        assert b["end_minutes"] == 690
        TestBlockedTimesCRUD.created_ids.append(b["id"])

    def test_create_recurring_block(self, headers):
        payload = {
            "day_of_week": "wednesday",
            "start_time": "13:00",
            "end_time": "14:00",
            "reason": "TEST_recurring_block",
            "is_recurring": True
        }
        r = requests.post(f"{API}/admin/blocked-times", headers=headers, json=payload, timeout=15)
        assert r.status_code == 201, r.text
        b = r.json()["blocked_time"]
        assert b["is_recurring"] is True
        assert b["day_of_week"] == "wednesday"
        TestBlockedTimesCRUD.created_ids.append(b["id"])

    def test_create_invalid_missing_times(self, headers):
        r = requests.post(f"{API}/admin/blocked-times", headers=headers, json={"date": "2026-05-01"}, timeout=15)
        assert r.status_code == 400

    def test_create_invalid_end_before_start(self, headers):
        r = requests.post(f"{API}/admin/blocked-times", headers=headers, json={
            "date": "2026-05-01", "start_time": "15:00", "end_time": "14:00", "is_recurring": False
        }, timeout=15)
        assert r.status_code == 400

    def test_get_for_date(self, headers):
        future_date = (datetime.utcnow() + timedelta(days=10)).strftime("%Y-%m-%d")
        r = requests.get(f"{API}/admin/blocked-times/for-date/{future_date}", headers=headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["date"] == future_date
        assert "day_of_week" in data
        assert "blocked_times" in data

    def test_delete_blocked_times(self, headers):
        for bid in TestBlockedTimesCRUD.created_ids:
            r = requests.delete(f"{API}/admin/blocked-times/{bid}", headers=headers, timeout=15)
            assert r.status_code == 200

    def test_delete_missing_returns_404(self, headers):
        r = requests.delete(f"{API}/admin/blocked-times/nonexistent-id-xxx", headers=headers, timeout=15)
        assert r.status_code == 404


# ---------- Availability respects blocked times ----------
class TestAvailabilityRespectsBlockedTimes:
    def test_blocked_slot_excluded(self, headers, a_price_id):
        # find a future weekday (Mon)
        d = datetime.utcnow()
        while d.weekday() != 0:  # Monday
            d += timedelta(days=1)
        if d.date() == datetime.utcnow().date():
            d += timedelta(days=7)
        date_str = d.strftime("%Y-%m-%d")

        # Create block 10:00-11:00
        payload = {"date": date_str, "start_time": "10:00", "end_time": "11:00", "is_recurring": False, "reason": "TEST_avail"}
        rc = requests.post(f"{API}/admin/blocked-times", headers=headers, json=payload, timeout=15)
        assert rc.status_code == 201
        block_id = rc.json()["blocked_time"]["id"]

        try:
            r = requests.get(f"{API}/bookings/availability", params={"date": date_str, "price_id": a_price_id}, timeout=15)
            assert r.status_code == 200, r.text
            data = r.json()
            if data.get("success"):
                slots = data.get("available_slots", [])
                # No slot should overlap 10:00-11:00 (600-660)
                for s in slots:
                    assert not (s["start_minutes"] < 660 and s["end_minutes"] > 600), f"Slot {s} overlaps blocked range"
        finally:
            requests.delete(f"{API}/admin/blocked-times/{block_id}", headers=headers, timeout=15)


# ---------- Admin create booking ----------
class TestAdminCreateBooking:
    def test_admin_create_with_new_client(self, headers, a_price_id):
        # future Tuesday
        d = datetime.utcnow() + timedelta(days=3)
        while d.weekday() >= 5:
            d += timedelta(days=1)
        date_str = d.strftime("%Y-%m-%d")

        payload = {
            "new_client": {
                "first_name": "TESTFirst",
                "last_name": "TESTLast",
                "email": f"test_admin_{datetime.utcnow().timestamp()}@example.com",
                "phone": "555-1234",
                "address": "123 Test St"
            },
            "price_id": a_price_id,
            "booking_date": date_str,
            "booking_time": "14:00",
            "is_home_visit": False,
            "notes": "TEST_admin_booking",
            "status": "confirmed"
        }
        r = requests.post(f"{API}/admin/bookings/create", headers=headers, json=payload, timeout=15)
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["success"] is True
        assert data["booking"]["first_name"] == "TESTFirst"
        assert data["booking"]["last_name"] == "TESTLast"
        assert data["booking"]["status"] == "confirmed"
        assert data["client"]["email"].startswith("test_admin_")

        booking_id = data["booking"]["id"]
        client_id = data["client"]["id"]

        # Verify booking is retrievable
        g = requests.get(f"{API}/admin/bookings/{booking_id}", headers=headers, timeout=15)
        assert g.status_code == 200
        assert g.json()["booking"]["id"] == booking_id

        # cleanup
        requests.delete(f"{API}/admin/bookings/{booking_id}", headers=headers, timeout=15)
        requests.delete(f"{API}/admin/clients/{client_id}", headers=headers, timeout=15)

    def test_admin_create_missing_fields(self, headers):
        r = requests.post(f"{API}/admin/bookings/create", headers=headers, json={}, timeout=15)
        assert r.status_code == 400

    def test_admin_create_with_existing_client(self, headers, a_price_id):
        # first create a client
        c = requests.post(f"{API}/admin/clients", headers=headers, json={
            "first_name": "TEST_Existing", "last_name": "Client",
            "email": f"test_existing_{datetime.utcnow().timestamp()}@example.com",
            "phone": "555-9999"
        }, timeout=15)
        assert c.status_code in (200, 201), c.text
        cdata = c.json()
        client = cdata.get("client") or cdata
        client_id = client["id"]

        d = datetime.utcnow() + timedelta(days=4)
        while d.weekday() >= 5:
            d += timedelta(days=1)
        date_str = d.strftime("%Y-%m-%d")

        r = requests.post(f"{API}/admin/bookings/create", headers=headers, json={
            "client_id": client_id, "price_id": a_price_id,
            "booking_date": date_str, "booking_time": "15:00", "status": "confirmed"
        }, timeout=15)
        assert r.status_code == 201, r.text
        booking_id = r.json()["booking"]["id"]

        # cleanup
        requests.delete(f"{API}/admin/bookings/{booking_id}", headers=headers, timeout=15)
        requests.delete(f"{API}/admin/clients/{client_id}", headers=headers, timeout=15)


# ---------- Settings: per-day location + remote message + colors ----------
class TestSettingsPerDayLocation:
    def test_update_settings_with_per_day_location(self, headers):
        # Get current settings
        cur = requests.get(f"{API}/settings", timeout=15)
        assert cur.status_code == 200
        current = cur.json().get("settings") or cur.json()

        booking_settings = current.get("booking_settings") or {}
        wh = booking_settings.get("working_hours") or {
            "monday": {"enabled": True, "start": "09:00", "end": "17:00"},
            "tuesday": {"enabled": True, "start": "09:00", "end": "17:00"},
            "wednesday": {"enabled": True, "start": "09:00", "end": "17:00"},
            "thursday": {"enabled": True, "start": "09:00", "end": "17:00"},
            "friday": {"enabled": True, "start": "09:00", "end": "17:00"},
            "saturday": {"enabled": False, "start": "09:00", "end": "17:00"},
            "sunday": {"enabled": False, "start": "09:00", "end": "17:00"},
        }
        # Add location_type per day
        wh["monday"]["location_type"] = "fixed"
        wh["tuesday"]["location_type"] = "remote"
        wh["wednesday"]["location_type"] = "both"

        payload = dict(current)
        payload["booking_settings"] = {
            **booking_settings,
            "enabled": True,
            "working_hours": wh,
            "remote_day_message": "TEST remote day message",
            "calendar_colors": {"fixed": "#111111", "remote": "#222222", "both": "#333333"}
        }
        # Remove _id if any
        payload.pop("_id", None)

        r = requests.put(f"{API}/admin/settings", headers=headers, json=payload, timeout=15)
        assert r.status_code == 200, r.text

        # Verify
        r2 = requests.get(f"{API}/bookings/settings", timeout=15)
        assert r2.status_code == 200
        s = r2.json()["settings"]
        assert s["remote_day_message"] == "TEST remote day message"
        assert s["calendar_colors"]["fixed"] == "#111111"
        assert s["working_hours"]["tuesday"].get("location_type") == "remote"
