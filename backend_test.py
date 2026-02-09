import requests
import sys
import json
from datetime import datetime

class BakeryAPITester:
    def __init__(self, base_url="https://custom-pickup.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    self.test_results.append({
                        "test": name,
                        "status": "PASS",
                        "response": response_data
                    })
                    return True, response_data
                except:
                    self.test_results.append({
                        "test": name,
                        "status": "PASS",
                        "response": response.text
                    })
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text}")
                self.test_results.append({
                    "test": name,
                    "status": "FAIL",
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "test": name,
                "status": "ERROR",
                "error": str(e)
            })
            return False, {}

    def test_health_check(self):
        """Test API health endpoints"""
        success1, _ = self.run_test("Health Check", "GET", "", 200)
        success2, _ = self.run_test("Health Endpoint", "GET", "health", 200)
        return success1 and success2

    def test_admin_login(self):
        """Test admin login with correct password"""
        success, _ = self.run_test(
            "Admin Login - Valid Password",
            "POST",
            "admin/login",
            200,
            params={"password": "bakery2024"}
        )
        
        # Test invalid password (should return 401, which is correct behavior)
        fail_success, _ = self.run_test(
            "Admin Login - Invalid Password",
            "POST", 
            "admin/login",
            401,
            params={"password": "wrongpassword"}
        )
        
        return success and fail_success

    def test_settings_management(self):
        """Test shop settings CRUD operations"""
        # Get settings
        success1, settings = self.run_test("Get Settings", "GET", "settings", 200)
        
        # Update settings
        update_data = {
            "shop_name": "Test Bakery",
            "pickup_info": "Test pickup info",
            "payment_info": "Test payment info",
            "email_message": "Test email message",
            "weekly_date": "Test Date"
        }
        success2, _ = self.run_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data=update_data
        )
        
        return success1 and success2

    def test_product_management(self):
        """Test product CRUD operations"""
        # Create a test product
        product_data = {
            "name": "Test Sourdough",
            "description": "Test description for sourdough bread",
            "price": 12.50,
            "quantity": 5,
            "max_quantity": 10,
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
            "active": True
        }
        
        success1, product = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if not success1:
            return False
            
        product_id = product.get('id')
        if not product_id:
            print("❌ No product ID returned")
            return False
        
        # Get all products
        success2, _ = self.run_test("Get All Products", "GET", "products", 200)
        
        # Get active products
        success3, _ = self.run_test("Get Active Products", "GET", "products/active", 200)
        
        # Get specific product
        success4, _ = self.run_test(
            "Get Specific Product",
            "GET",
            f"products/{product_id}",
            200
        )
        
        # Update product
        update_data = {
            "quantity": 3,
            "price": 15.00
        }
        success5, _ = self.run_test(
            "Update Product",
            "PUT",
            f"products/{product_id}",
            200,
            data=update_data
        )
        
        # Store product ID for order testing
        self.test_product_id = product_id
        
        return success1 and success2 and success3 and success4 and success5

    def test_order_management(self):
        """Test order creation and management"""
        if not hasattr(self, 'test_product_id'):
            print("❌ No test product available for order testing")
            return False
        
        # Create an order
        order_data = {
            "customer_name": "Test Customer",
            "email": "test@example.com",
            "phone": "555-123-4567",
            "notes": "Test order notes",
            "items": [
                {
                    "product_id": self.test_product_id,
                    "product_name": "Test Sourdough",
                    "quantity": 2,
                    "price": 15.00
                }
            ]
        }
        
        success1, order = self.run_test(
            "Create Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if not success1:
            return False
            
        order_id = order.get('id')
        if not order_id:
            print("❌ No order ID returned")
            return False
        
        # Store order ID for archive testing
        self.test_order_id = order_id
        
        # Get all orders
        success2, _ = self.run_test("Get All Orders", "GET", "orders", 200)
        
        # Get active orders (archived=false)
        success3, _ = self.run_test("Get Active Orders", "GET", "orders", 200, params={"archived": "false"})
        
        # Get archived orders (archived=true) 
        success4, _ = self.run_test("Get Archived Orders", "GET", "orders", 200, params={"archived": "true"})
        
        # Update order status
        success5, _ = self.run_test(
            "Update Order Status - Complete",
            "PUT",
            f"orders/{order_id}/status",
            200,
            params={"status": "completed"}
        )
        
        success6, _ = self.run_test(
            "Update Order Status - Cancel",
            "PUT",
            f"orders/{order_id}/status",
            200,
            params={"status": "cancelled"}
        )
        
        return success1 and success2 and success3 and success4 and success5 and success6

    def test_archive_functionality(self):
        """Test order archive/unarchive/delete functionality"""
        if not hasattr(self, 'test_order_id'):
            print("❌ No test order available for archive testing")
            return False
        
        order_id = self.test_order_id
        
        # Archive order
        success1, _ = self.run_test(
            "Archive Order",
            "PUT",
            f"orders/{order_id}/archive",
            200
        )
        
        # Verify order is archived by checking archived orders list
        success2, archived_orders = self.run_test(
            "Get Archived Orders After Archive",
            "GET", 
            "orders",
            200,
            params={"archived": "true"}
        )
        
        # Check if our order is in archived list
        archived_found = False
        if success2 and isinstance(archived_orders, list):
            archived_found = any(order.get('id') == order_id for order in archived_orders)
            if archived_found:
                print(f"✅ Order {order_id} found in archived orders")
            else:
                print(f"❌ Order {order_id} not found in archived orders")
        
        # Unarchive order
        success3, _ = self.run_test(
            "Unarchive Order",
            "PUT",
            f"orders/{order_id}/unarchive",
            200
        )
        
        # Verify order is back in active orders
        success4, active_orders = self.run_test(
            "Get Active Orders After Unarchive",
            "GET",
            "orders", 
            200,
            params={"archived": "false"}
        )
        
        # Check if our order is back in active list
        active_found = False
        if success4 and isinstance(active_orders, list):
            active_found = any(order.get('id') == order_id for order in active_orders)
            if active_found:
                print(f"✅ Order {order_id} found in active orders after unarchive")
            else:
                print(f"❌ Order {order_id} not found in active orders after unarchive")
        
        # Archive again for delete test
        success5, _ = self.run_test(
            "Archive Order Again",
            "PUT",
            f"orders/{order_id}/archive",
            200
        )
        
        # Delete order
        success6, _ = self.run_test(
            "Delete Order",
            "DELETE",
            f"orders/{order_id}",
            200
        )
        
        return success1 and success2 and archived_found and success3 and success4 and active_found and success5 and success6

    def test_stats_endpoint(self):
        """Test order stats endpoint"""
        success, stats = self.run_test(
            "Get Order Stats",
            "GET",
            "orders/stats",
            200
        )
        
        if not success:
            return False
        
        # Verify stats structure
        required_keys = ['current_week', 'previous_week', 'all_time']
        for key in required_keys:
            if key not in stats:
                print(f"❌ Missing key '{key}' in stats response")
                return False
        
        # Verify current_week structure
        current_week = stats.get('current_week', {})
        week_keys = ['total_orders', 'completed_orders', 'cancelled_orders', 'pending_orders', 'total_revenue', 'completed_revenue']
        for key in week_keys:
            if key not in current_week:
                print(f"❌ Missing key '{key}' in current_week stats")
                return False
        
        # Verify previous_week structure  
        previous_week = stats.get('previous_week', {})
        for key in week_keys:
            if key not in previous_week:
                print(f"❌ Missing key '{key}' in previous_week stats")
                return False
        
        # Verify all_time structure
        all_time = stats.get('all_time', {})
        all_time_keys = ['total_orders', 'completed_orders', 'cancelled_orders', 'total_revenue', 'completed_revenue']
        for key in all_time_keys:
            if key not in all_time:
                print(f"❌ Missing key '{key}' in all_time stats")
                return False
        
        print(f"✅ Stats structure validated successfully")
        print(f"   Current week: {current_week['total_orders']} orders, ${current_week['total_revenue']:.2f} revenue")
        print(f"   Previous week: {previous_week['total_orders']} orders, ${previous_week['total_revenue']:.2f} revenue") 
        print(f"   All time: {all_time['total_orders']} orders, ${all_time['total_revenue']:.2f} revenue")
        
        return True

    def cleanup_test_data(self):
        """Clean up test product if created"""
        if hasattr(self, 'test_product_id'):
            self.run_test(
                "Delete Test Product",
                "DELETE",
                f"products/{self.test_product_id}",
                200
            )

def main():
    print("🧪 Starting Bakery API Tests...")
    print("=" * 50)
    
    tester = BakeryAPITester()
    
    # Run all tests
    tests = [
        ("Health Check", tester.test_health_check),
        ("Admin Authentication", tester.test_admin_login),
        ("Settings Management", tester.test_settings_management),
        ("Product Management", tester.test_product_management),
        ("Order Management", tester.test_order_management),
    ]
    
    all_passed = True
    
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} tests...")
        try:
            result = test_func()
            if not result:
                all_passed = False
                print(f"❌ {test_name} tests failed")
            else:
                print(f"✅ {test_name} tests passed")
        except Exception as e:
            print(f"❌ {test_name} tests error: {str(e)}")
            all_passed = False
    
    # Cleanup
    print(f"\n🧹 Cleaning up test data...")
    tester.cleanup_test_data()
    
    # Print final results
    print(f"\n📊 Final Results:")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if all_passed:
        print("🎉 All test suites passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())