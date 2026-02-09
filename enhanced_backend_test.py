import requests
import sys
import json
from datetime import datetime

class EnhancedBakeryAPITester:
    def __init__(self, base_url="https://custom-pickup.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_orders = []
        self.created_products = []

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

    def setup_test_data(self):
        """Create test products and orders for testing"""
        print("\n🏗️ Setting up test data...")
        
        # Create test product
        product_data = {
            "name": "Test Revenue Bread",
            "description": "Test bread for revenue calculations",
            "price": 25.00,
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
            "active": True,
            "availability": [
                {
                    "date": "2025-01-20",
                    "quantity": 10,
                    "max_quantity": 10
                }
            ]
        }
        
        success, product = self.run_test(
            "Create Test Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if not success:
            return False
            
        product_id = product.get('id')
        self.created_products.append(product_id)
        
        # Create multiple test orders with different statuses
        orders_to_create = [
            {
                "customer_name": "Test Customer 1",
                "email": "test1@example.com", 
                "phone": "555-111-1111",
                "notes": "Test order 1",
                "pickup_date": "2025-01-20",
                "items": [
                    {
                        "product_id": product_id,
                        "product_name": "Test Revenue Bread",
                        "quantity": 2,
                        "price": 25.00,
                        "pickup_date": "2025-01-20"
                    }
                ]
            },
            {
                "customer_name": "Test Customer 2", 
                "email": "test2@example.com",
                "phone": "555-222-2222",
                "notes": "Test order 2",
                "pickup_date": "2025-01-20",
                "items": [
                    {
                        "product_id": product_id,
                        "product_name": "Test Revenue Bread",
                        "quantity": 1,
                        "price": 25.00,
                        "pickup_date": "2025-01-20"
                    }
                ]
            },
            {
                "customer_name": "Test Customer 3",
                "email": "test3@example.com",
                "phone": "555-333-3333", 
                "notes": "Test order 3",
                "pickup_date": "2025-01-20",
                "items": [
                    {
                        "product_id": product_id,
                        "product_name": "Test Revenue Bread",
                        "quantity": 3,
                        "price": 25.00,
                        "pickup_date": "2025-01-20"
                    }
                ]
            }
        ]
        
        for i, order_data in enumerate(orders_to_create):
            success, order = self.run_test(
                f"Create Test Order {i+1}",
                "POST",
                "orders",
                200,
                data=order_data
            )
            
            if success:
                order_id = order.get('id')
                self.created_orders.append(order_id)
                
                # Set different statuses for testing
                if i == 0:  # First order - completed
                    self.run_test(
                        f"Set Order {i+1} to Completed",
                        "PUT",
                        f"orders/{order_id}/status",
                        200,
                        params={"status": "completed"}
                    )
                elif i == 1:  # Second order - cancelled (should not count in revenue)
                    self.run_test(
                        f"Set Order {i+1} to Cancelled",
                        "PUT",
                        f"orders/{order_id}/status",
                        200,
                        params={"status": "cancelled"}
                    )
                # Third order stays pending
        
        return len(self.created_orders) == 3

    def test_delete_order_functionality(self):
        """Test delete order functionality and revenue impact"""
        print("\n🗑️ Testing Delete Order Functionality...")
        
        if len(self.created_orders) < 3:
            print("❌ Not enough test orders created")
            return False
        
        # Get initial stats
        success, initial_stats = self.run_test(
            "Get Initial Stats",
            "GET",
            "orders/stats",
            200
        )
        
        if not success:
            return False
        
        initial_revenue = initial_stats.get('totals', {}).get('total_revenue', 0)
        initial_orders = initial_stats.get('totals', {}).get('total_orders', 0)
        
        print(f"📊 Initial revenue: ${initial_revenue:.2f}, Initial orders: {initial_orders}")
        
        # Delete the completed order (should reduce revenue by $50.00)
        completed_order_id = self.created_orders[0]
        success, _ = self.run_test(
            "Delete Completed Order",
            "DELETE",
            f"orders/{completed_order_id}",
            200
        )
        
        if not success:
            return False
        
        # Get stats after deletion
        success, after_delete_stats = self.run_test(
            "Get Stats After Delete",
            "GET",
            "orders/stats",
            200
        )
        
        if not success:
            return False
        
        after_revenue = after_delete_stats.get('totals', {}).get('total_revenue', 0)
        after_orders = after_delete_stats.get('totals', {}).get('total_orders', 0)
        
        print(f"📊 After delete revenue: ${after_revenue:.2f}, After delete orders: {after_orders}")
        
        # Verify revenue decreased by $50.00 (2 items * $25.00)
        expected_revenue_decrease = 50.00
        actual_revenue_decrease = initial_revenue - after_revenue
        
        revenue_correct = abs(actual_revenue_decrease - expected_revenue_decrease) < 0.01
        orders_decreased = after_orders == (initial_orders - 1)
        
        if revenue_correct:
            print(f"✅ Revenue correctly decreased by ${actual_revenue_decrease:.2f}")
        else:
            print(f"❌ Revenue decrease incorrect. Expected: ${expected_revenue_decrease:.2f}, Actual: ${actual_revenue_decrease:.2f}")
        
        if orders_decreased:
            print(f"✅ Order count correctly decreased")
        else:
            print(f"❌ Order count incorrect. Expected: {initial_orders - 1}, Actual: {after_orders}")
        
        return revenue_correct and orders_decreased

    def test_cancelled_order_revenue(self):
        """Test that cancelled orders show $0.00 revenue"""
        print("\n💰 Testing Cancelled Order Revenue...")
        
        # Get current stats
        success, stats = self.run_test(
            "Get Stats for Cancelled Order Check",
            "GET",
            "orders/stats",
            200
        )
        
        if not success:
            return False
        
        # Check by_date stats for our test date
        by_date = stats.get('by_date', [])
        test_date_stats = None
        
        for date_stat in by_date:
            if date_stat.get('date') == '2025-01-20':
                test_date_stats = date_stat
                break
        
        if not test_date_stats:
            print("❌ No stats found for test date 2025-01-20")
            return False
        
        cancelled_orders = test_date_stats.get('cancelled_orders', 0)
        total_revenue = test_date_stats.get('total_revenue', 0)
        
        print(f"📊 Cancelled orders: {cancelled_orders}")
        print(f"📊 Total revenue for date: ${total_revenue:.2f}")
        
        # We should have 1 cancelled order, and revenue should not include it
        # Expected: 1 pending order ($75) + 0 from cancelled order = $75
        expected_revenue = 75.00  # Only the pending order should count
        revenue_correct = abs(total_revenue - expected_revenue) < 0.01
        
        if revenue_correct:
            print(f"✅ Cancelled orders correctly excluded from revenue")
        else:
            print(f"❌ Revenue calculation incorrect. Expected: ${expected_revenue:.2f}, Actual: ${total_revenue:.2f}")
        
        return revenue_correct and cancelled_orders >= 1

    def test_revenue_by_period(self):
        """Test Revenue by Week, Month, Year sections"""
        print("\n📅 Testing Revenue by Period...")
        
        success, stats = self.run_test(
            "Get Stats for Period Testing",
            "GET",
            "orders/stats",
            200
        )
        
        if not success:
            return False
        
        # Check for required period sections
        required_sections = ['by_week', 'by_month', 'by_year']
        sections_present = True
        
        for section in required_sections:
            if section not in stats:
                print(f"❌ Missing section: {section}")
                sections_present = False
            else:
                section_data = stats[section]
                if isinstance(section_data, list):
                    print(f"✅ {section} section present with {len(section_data)} entries")
                    
                    # Check structure of first entry if exists
                    if len(section_data) > 0:
                        entry = section_data[0]
                        required_keys = ['key', 'label', 'revenue', 'orders', 'completed', 'cancelled']
                        for key in required_keys:
                            if key not in entry:
                                print(f"❌ Missing key '{key}' in {section} entry")
                                sections_present = False
                            else:
                                print(f"   ✅ {key}: {entry[key]}")
                else:
                    print(f"❌ {section} is not a list")
                    sections_present = False
        
        return sections_present

    def test_archive_delete_functionality(self):
        """Test delete functionality on archived orders"""
        print("\n📦 Testing Archive and Delete Functionality...")
        
        if len(self.created_orders) < 2:
            print("❌ Not enough orders for archive testing")
            return False
        
        # Use the remaining cancelled order for archive testing
        order_id = self.created_orders[1]  # The cancelled order
        
        # Archive the order
        success, _ = self.run_test(
            "Archive Order",
            "PUT",
            f"orders/{order_id}/archive",
            200
        )
        
        if not success:
            return False
        
        # Verify it appears in archived orders
        success, archived_orders = self.run_test(
            "Get Archived Orders",
            "GET",
            "orders",
            200,
            params={"archived": "true"}
        )
        
        if not success:
            return False
        
        archived_found = any(order.get('id') == order_id for order in archived_orders)
        
        if not archived_found:
            print(f"❌ Order {order_id} not found in archived orders")
            return False
        
        print(f"✅ Order {order_id} successfully archived")
        
        # Delete the archived order
        success, _ = self.run_test(
            "Delete Archived Order",
            "DELETE",
            f"orders/{order_id}",
            200
        )
        
        if not success:
            return False
        
        # Verify it's no longer in archived orders
        success, archived_orders_after = self.run_test(
            "Get Archived Orders After Delete",
            "GET",
            "orders",
            200,
            params={"archived": "true"}
        )
        
        if not success:
            return False
        
        still_archived = any(order.get('id') == order_id for order in archived_orders_after)
        
        if still_archived:
            print(f"❌ Order {order_id} still found in archived orders after delete")
            return False
        
        print(f"✅ Order {order_id} successfully deleted from archived orders")
        
        return True

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete remaining orders
        for order_id in self.created_orders:
            self.run_test(
                f"Delete Order {order_id}",
                "DELETE",
                f"orders/{order_id}",
                200
            )
        
        # Delete test products
        for product_id in self.created_products:
            self.run_test(
                f"Delete Product {product_id}",
                "DELETE",
                f"products/{product_id}",
                200
            )

def main():
    print("🧪 Starting Enhanced Bakery API Tests for New Features...")
    print("=" * 60)
    
    tester = EnhancedBakeryAPITester()
    
    # Setup test data
    if not tester.setup_test_data():
        print("❌ Failed to setup test data")
        return 1
    
    # Run enhanced tests
    tests = [
        ("Delete Order Functionality", tester.test_delete_order_functionality),
        ("Cancelled Order Revenue", tester.test_cancelled_order_revenue),
        ("Revenue by Period", tester.test_revenue_by_period),
        ("Archive Delete Functionality", tester.test_archive_delete_functionality),
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
    tester.cleanup_test_data()
    
    # Print final results
    print(f"\n📊 Final Results:")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if all_passed:
        print("🎉 All enhanced test suites passed!")
        return 0
    else:
        print("❌ Some enhanced tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())