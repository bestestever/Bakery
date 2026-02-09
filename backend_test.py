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
        """Test product CRUD operations with date-based availability"""
        # Create a test product with date availability
        product_data = {
            "name": "Test Sourdough",
            "description": "Test description for sourdough bread",
            "price": 12.50,
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
            "active": True,
            "availability": [
                {
                    "date": "2025-01-15",
                    "quantity": 5,
                    "max_quantity": 10
                },
                {
                    "date": "2025-01-16",
                    "quantity": 3,
                    "max_quantity": 8
                }
            ]
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
        
        # Update product with new date availability
        update_data = {
            "availability": [
                {
                    "date": "2025-01-15",
                    "quantity": 2,
                    "max_quantity": 10
                },
                {
                    "date": "2025-01-17",
                    "quantity": 4,
                    "max_quantity": 6
                }
            ]
        }
        success5, _ = self.run_test(
            "Update Product",
            "PUT",
            f"products/{product_id}",
            200,
            data=update_data
        )
        
        # Test get products by date endpoint
        success6, products_by_date = self.run_test(
            "Get Products by Date",
            "GET",
            "products/by-date/2025-01-15",
            200
        )
        
        # Verify product appears in date-specific query
        date_product_found = False
        if success6 and isinstance(products_by_date, list):
            date_product_found = any(p.get('id') == product_id for p in products_by_date)
            if date_product_found:
                print(f"✅ Product {product_id} found in date-specific query")
            else:
                print(f"❌ Product {product_id} not found in date-specific query")
        
        # Store product ID for order testing
        self.test_product_id = product_id
        
        return success1 and success2 and success3 and success4 and success5 and success6 and date_product_found

    def test_order_management(self):
        """Test order creation and management with pickup dates"""
        if not hasattr(self, 'test_product_id'):
            print("❌ No test product available for order testing")
            return False
        
        # Create an order with pickup date
        order_data = {
            "customer_name": "Test Customer",
            "email": "test@example.com",
            "phone": "555-123-4567",
            "notes": "Test order notes",
            "pickup_date": "2025-01-15",
            "items": [
                {
                    "product_id": self.test_product_id,
                    "product_name": "Test Sourdough",
                    "quantity": 1,
                    "price": 12.50,
                    "pickup_date": "2025-01-15"
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
        """Test order stats endpoint with pickup date grouping"""
        success, stats = self.run_test(
            "Get Order Stats",
            "GET",
            "orders/stats",
            200
        )
        
        if not success:
            return False
        
        # Verify stats structure for new pickup date grouping
        required_keys = ['by_date', 'totals']
        for key in required_keys:
            if key not in stats:
                print(f"❌ Missing key '{key}' in stats response")
                return False
        
        # Verify totals structure
        totals = stats.get('totals', {})
        totals_keys = ['total_orders', 'completed_orders', 'cancelled_orders', 'pending_orders', 'total_revenue', 'completed_revenue']
        for key in totals_keys:
            if key not in totals:
                print(f"❌ Missing key '{key}' in totals stats")
                return False
        
        # Verify by_date structure (should be array of date stats)
        by_date = stats.get('by_date', [])
        if not isinstance(by_date, list):
            print(f"❌ by_date should be a list, got {type(by_date)}")
            return False
        
        # If there are date stats, verify structure
        if len(by_date) > 0:
            date_stat = by_date[0]
            date_keys = ['date', 'total_orders', 'completed_orders', 'cancelled_orders', 'pending_orders', 'total_revenue', 'completed_revenue', 'orders']
            for key in date_keys:
                if key not in date_stat:
                    print(f"❌ Missing key '{key}' in date stats")
                    return False
        
        print(f"✅ Stats structure validated successfully")
        print(f"   Total orders: {totals['total_orders']}, Total revenue: ${totals['total_revenue']:.2f}")
        print(f"   Date groups: {len(by_date)}")
        
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
        ("Archive Functionality", tester.test_archive_functionality),
        ("Stats Endpoint", tester.test_stats_endpoint),
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