#!/usr/bin/env python3
"""
White Dove Wellness Backend API Test Suite
Tests all public and admin endpoints for the reflexology business website
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class WhiteDoveAPITester:
    def __init__(self, base_url="https://reflexcare.preview.emergentagent.com"):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append(f"{name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    expected_status: int = 200, auth_required: bool = False) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {}, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            if not success:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                if response_data.get('message'):
                    error_msg += f" - {response_data['message']}"
                return False, response_data, error_msg

            return True, response_data, ""

        except requests.exceptions.RequestException as e:
            return False, {}, f"Request failed: {str(e)}"

    def test_public_endpoints(self):
        """Test all public endpoints"""
        print("\n🌍 Testing Public Endpoints")
        print("=" * 50)

        # Test therapies endpoint
        success, data, error = self.make_request('GET', 'therapies?active_only=true')
        if success and 'therapies' in data:
            therapy_count = len(data['therapies'])
            self.log_test("GET /api/therapies", True, f"Found {therapy_count} therapies")
            
            # Test individual therapy if any exist
            if therapy_count > 0:
                therapy_id = data['therapies'][0]['id']
                success, _, error = self.make_request('GET', f'therapies/{therapy_id}')
                self.log_test("GET /api/therapies/:id", success, error)
        else:
            self.log_test("GET /api/therapies", False, error)

        # Test prices endpoint
        success, data, error = self.make_request('GET', 'prices?active_only=true')
        if success and 'prices' in data:
            price_count = len(data['prices'])
            self.log_test("GET /api/prices", True, f"Found {price_count} prices")
        else:
            self.log_test("GET /api/prices", False, error)

        # Test affiliations endpoint
        success, data, error = self.make_request('GET', 'affiliations?active_only=true')
        if success and 'affiliations' in data:
            affiliation_count = len(data['affiliations'])
            self.log_test("GET /api/affiliations", True, f"Found {affiliation_count} affiliations")
        else:
            self.log_test("GET /api/affiliations", False, error)

        # Test policies endpoint
        success, data, error = self.make_request('GET', 'policies?active_only=true')
        if success and 'policies' in data:
            policy_count = len(data['policies'])
            self.log_test("GET /api/policies", True, f"Found {policy_count} policies")
        else:
            self.log_test("GET /api/policies", False, error)

        # Test settings endpoint
        success, data, error = self.make_request('GET', 'settings')
        if success and 'settings' in data:
            self.log_test("GET /api/settings", True, "Settings loaded")
        else:
            self.log_test("GET /api/settings", False, error)

        # Test contact form submission
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "1234567890",
            "message": "Test contact message",
            "preferred_contact": "email"
        }
        success, data, error = self.make_request('POST', 'contact', contact_data, 201)
        self.log_test("POST /api/contact", success, error)

    def test_admin_authentication(self):
        """Test admin authentication endpoints"""
        print("\n🔐 Testing Admin Authentication")
        print("=" * 50)

        # Test login with default credentials
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        success, data, error = self.make_request('POST', 'admin/auth/login', login_data)
        if success and 'access_token' in data:
            self.access_token = data['access_token']
            self.refresh_token = data.get('refresh_token')
            self.log_test("POST /api/admin/auth/login", True, "Login successful")
            
            # Test getting current user
            success, user_data, error = self.make_request('GET', 'admin/auth/me', auth_required=True)
            if success and 'user' in user_data:
                username = user_data['user'].get('username', 'unknown')
                self.log_test("GET /api/admin/auth/me", True, f"User: {username}")
            else:
                self.log_test("GET /api/admin/auth/me", False, error)
                
            # Test token refresh if refresh token exists
            if self.refresh_token:
                refresh_data = {"refresh_token": self.refresh_token}
                success, refresh_response, error = self.make_request('POST', 'admin/auth/refresh', refresh_data)
                if success and 'access_token' in refresh_response:
                    self.access_token = refresh_response['access_token']
                    self.log_test("POST /api/admin/auth/refresh", True, "Token refreshed")
                else:
                    self.log_test("POST /api/admin/auth/refresh", False, error)
        else:
            self.log_test("POST /api/admin/auth/login", False, error)
            return False

        return True

    def test_admin_crud_operations(self):
        """Test admin CRUD operations"""
        if not self.access_token:
            print("❌ Skipping admin CRUD tests - no authentication token")
            return

        print("\n⚙️ Testing Admin CRUD Operations")
        print("=" * 50)

        # Test therapies CRUD
        self.test_therapies_crud()
        
        # Test prices CRUD
        self.test_prices_crud()
        
        # Test clients CRUD
        self.test_clients_crud()
        
        # Test admin data retrieval
        self.test_admin_data_retrieval()

    def test_therapies_crud(self):
        """Test therapy CRUD operations"""
        # Create therapy
        therapy_data = {
            "name": "Test Therapy",
            "short_description": "A test therapy for API testing",
            "full_description": "This is a comprehensive test therapy description",
            "icon": "Sparkles",
            "display_order": 999,
            "is_active": True
        }
        
        success, data, error = self.make_request('POST', 'admin/therapies', therapy_data, 201, True)
        if success and 'therapy' in data:
            therapy_id = data['therapy']['id']
            self.log_test("POST /api/admin/therapies", True, f"Created therapy: {therapy_id}")
            
            # Update therapy
            update_data = {"name": "Updated Test Therapy"}
            success, _, error = self.make_request('PUT', f'admin/therapies/{therapy_id}', update_data, 200, True)
            self.log_test("PUT /api/admin/therapies/:id", success, error)
            
            # Delete therapy
            success, _, error = self.make_request('DELETE', f'admin/therapies/{therapy_id}', expected_status=200, auth_required=True)
            self.log_test("DELETE /api/admin/therapies/:id", success, error)
        else:
            self.log_test("POST /api/admin/therapies", False, error)

    def test_prices_crud(self):
        """Test price CRUD operations"""
        # Get existing therapies first
        success, therapies_data, _ = self.make_request('GET', 'therapies')
        if not success or not therapies_data.get('therapies'):
            self.log_test("Price CRUD", False, "No therapies available for price testing")
            return
            
        therapy_id = therapies_data['therapies'][0]['id']
        
        # Create price
        price_data = {
            "therapy_id": therapy_id,
            "duration": "60 minutes",
            "price": 75.00,
            "description": "Test price entry",
            "is_active": True
        }
        
        success, data, error = self.make_request('POST', 'admin/prices', price_data, 201, True)
        if success and 'price' in data:
            price_id = data['price']['id']
            self.log_test("POST /api/admin/prices", True, f"Created price: {price_id}")
            
            # Update price
            update_data = {"price": 80.00}
            success, _, error = self.make_request('PUT', f'admin/prices/{price_id}', update_data, 200, True)
            self.log_test("PUT /api/admin/prices/:id", success, error)
            
            # Delete price
            success, _, error = self.make_request('DELETE', f'admin/prices/{price_id}', expected_status=200, auth_required=True)
            self.log_test("DELETE /api/admin/prices/:id", success, error)
        else:
            self.log_test("POST /api/admin/prices", False, error)

    def test_clients_crud(self):
        """Test client CRUD operations"""
        # Create client
        client_data = {
            "first_name": "Test",
            "last_name": "Client",
            "email": "testclient@example.com",
            "phone": "1234567890",
            "address": "123 Test Street",
            "medical_notes": "Test medical notes"
        }
        
        success, data, error = self.make_request('POST', 'admin/clients', client_data, 201, True)
        if success and 'client' in data:
            client_id = data['client']['id']
            self.log_test("POST /api/admin/clients", True, f"Created client: {client_id}")
            
            # Test client notes
            note_data = {
                "note": "Test session note",
                "session_date": "2024-01-30"
            }
            success, note_response, error = self.make_request('POST', f'admin/clients/{client_id}/notes', note_data, 201, True)
            if success and 'note' in note_response:
                note_id = note_response['note']['id']
                self.log_test("POST /api/admin/clients/:id/notes", True, f"Created note: {note_id}")
                
                # Get client notes
                success, _, error = self.make_request('GET', f'admin/clients/{client_id}/notes', auth_required=True)
                self.log_test("GET /api/admin/clients/:id/notes", success, error)
                
                # Delete note
                success, _, error = self.make_request('DELETE', f'admin/clients/{client_id}/notes/{note_id}', expected_status=200, auth_required=True)
                self.log_test("DELETE /api/admin/clients/:id/notes/:noteId", success, error)
            else:
                self.log_test("POST /api/admin/clients/:id/notes", False, error)
            
            # Update client
            update_data = {"first_name": "Updated Test"}
            success, _, error = self.make_request('PUT', f'admin/clients/{client_id}', update_data, 200, True)
            self.log_test("PUT /api/admin/clients/:id", success, error)
            
            # Delete client
            success, _, error = self.make_request('DELETE', f'admin/clients/{client_id}', expected_status=200, auth_required=True)
            self.log_test("DELETE /api/admin/clients/:id", success, error)
        else:
            self.log_test("POST /api/admin/clients", False, error)

    def test_admin_data_retrieval(self):
        """Test admin data retrieval endpoints"""
        endpoints = [
            ('admin/contacts', 'contacts'),
            ('admin/affiliations', 'affiliations'),
            ('admin/policies', 'policies'),
            ('admin/users', 'users'),
            ('admin/settings', 'settings')
        ]
        
        for endpoint, data_key in endpoints:
            success, data, error = self.make_request('GET', endpoint, auth_required=True)
            if success and data_key in data:
                count = len(data[data_key]) if isinstance(data[data_key], list) else "N/A"
                self.log_test(f"GET /api/{endpoint}", True, f"Retrieved {count} items")
            else:
                self.log_test(f"GET /api/{endpoint}", success, error)

    def run_all_tests(self):
        """Run complete test suite"""
        print("🕊️ White Dove Wellness API Test Suite")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test public endpoints
        self.test_public_endpoints()
        
        # Test admin authentication
        auth_success = self.test_admin_authentication()
        
        # Test admin CRUD operations (only if auth successful)
        if auth_success:
            self.test_admin_crud_operations()
        
        # Print summary
        self.print_summary()
        
        return self.tests_passed == self.tests_run

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, failure in enumerate(self.failed_tests, 1):
                print(f"{i}. {failure}")
        
        print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    """Main test execution"""
    tester = WhiteDoveAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())