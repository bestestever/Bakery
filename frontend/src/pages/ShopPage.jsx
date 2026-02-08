import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { ShoppingBag, Plus, Minus, X, Send, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    customer_name: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products/active`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      toast.error("This item is sold out");
      return;
    }

    const existingItem = cart.find((item) => item.product_id === product.id);
    const currentQty = existingItem ? existingItem.quantity : 0;

    if (currentQty >= product.quantity) {
      toast.error(`Only ${product.quantity} available`);
      return;
    }

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          price: product.price,
          max_available: product.quantity,
        },
      ]);
    }
    toast.success(`Added ${product.name} to cart`);
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(
      cart
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.max_available) {
              toast.error(`Only ${item.max_available} available`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!formData.customer_name || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        ...formData,
        items: cart.map(({ product_id, product_name, quantity, price }) => ({
          product_id,
          product_name,
          quantity,
          price,
        })),
      };

      await axios.post(`${API}/orders`, orderData);
      
      setOrderSuccess(true);
      setCart([]);
      setFormData({ customer_name: "", email: "", phone: "", notes: "" });
      toast.success("Order placed successfully! Check your email for confirmation.");
      
      // Refresh products to update quantities
      fetchProducts();
    } catch (error) {
      console.error("Error submitting order:", error);
      const errorMsg = error.response?.data?.detail || "Failed to place order";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="shop-container">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center animate-fade-in">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-stone-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-stone-900 mb-4">
                Thank You!
              </h1>
              <p className="text-stone-600 mb-6">
                Your order has been placed successfully. We've sent a confirmation email with pickup and payment details.
              </p>
              <div className="bg-stone-50 rounded-xl p-4 mb-6 text-left">
                <h3 className="font-medium text-stone-900 mb-2">Pickup Info</h3>
                <p className="text-stone-600 text-sm">{settings.pickup_info}</p>
                <h3 className="font-medium text-stone-900 mt-4 mb-2">Payment</h3>
                <p className="text-stone-600 text-sm">{settings.payment_info}</p>
              </div>
              <Button
                onClick={() => setOrderSuccess(false)}
                className="btn-primary w-full text-white rounded-xl py-3"
                data-testid="back-to-shop-btn"
              >
                Back to Shop
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-container">
      {/* Header */}
      <header className="shop-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-orange-700" />
              <h1 className="font-heading text-2xl font-bold text-stone-900" data-testid="shop-name">
                {settings.shop_name || "Weekly Bakery"}
              </h1>
            </div>
            
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="relative rounded-xl border-stone-300"
                  data-testid="cart-button"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md" data-testid="cart-sheet">
                <SheetHeader>
                  <SheetTitle className="font-heading text-xl">Your Order</SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 flex flex-col h-[calc(100vh-180px)]">
                  {cart.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-stone-500">Your cart is empty</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-auto space-y-4">
                        {cart.map((item) => (
                          <div
                            key={item.product_id}
                            className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl"
                            data-testid={`cart-item-${item.product_id}`}
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-stone-900">
                                {item.product_name}
                              </h4>
                              <p className="text-sm text-stone-600">
                                ${item.price.toFixed(2)} each
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartQuantity(item.product_id, -1)}
                                className="quantity-btn"
                                data-testid={`decrease-qty-${item.product_id}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(item.product_id, 1)}
                                className="quantity-btn"
                                disabled={item.quantity >= item.max_available}
                                data-testid={`increase-qty-${item.product_id}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.product_id)}
                                className="ml-2 text-stone-400 hover:text-red-500 transition-colors"
                                data-testid={`remove-item-${item.product_id}`}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-t border-stone-200 pt-4 mt-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-medium text-stone-900">Total</span>
                          <span className="text-xl font-bold text-stone-900" data-testid="cart-total">
                            ${cartTotal.toFixed(2)}
                          </span>
                        </div>
                        
                        <form onSubmit={handleSubmitOrder} className="space-y-4">
                          <div>
                            <Label htmlFor="name" className="text-stone-700">Name *</Label>
                            <Input
                              id="name"
                              value={formData.customer_name}
                              onChange={(e) =>
                                setFormData({ ...formData, customer_name: e.target.value })
                              }
                              placeholder="Your name"
                              className="mt-1 rounded-lg"
                              required
                              data-testid="input-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email" className="text-stone-700">Email *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({ ...formData, email: e.target.value })
                              }
                              placeholder="your@email.com"
                              className="mt-1 rounded-lg"
                              required
                              data-testid="input-email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone" className="text-stone-700">Phone *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) =>
                                setFormData({ ...formData, phone: e.target.value })
                              }
                              placeholder="(555) 123-4567"
                              className="mt-1 rounded-lg"
                              required
                              data-testid="input-phone"
                            />
                          </div>
                          <div>
                            <Label htmlFor="notes" className="text-stone-700">Notes (optional)</Label>
                            <Textarea
                              id="notes"
                              value={formData.notes}
                              onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                              }
                              placeholder="Any special requests..."
                              className="mt-1 rounded-lg resize-none"
                              rows={2}
                              data-testid="input-notes"
                            />
                          </div>
                          <Button
                            type="submit"
                            disabled={submitting || cart.length === 0}
                            className="btn-primary w-full text-white rounded-xl py-3"
                            data-testid="submit-order-btn"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Placing Order...
                              </>
                            ) : (
                              "Place Order"
                            )}
                          </Button>
                        </form>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-stone-900 mb-4 animate-fade-in">
            Fresh Baked Weekly
          </h2>
          <p className="text-lg text-stone-600 max-w-xl mx-auto animate-fade-in stagger-1">
            {settings.weekly_date && `Orders for ${settings.weekly_date}`}
          </p>
          {settings.pickup_info && (
            <p className="text-stone-500 mt-2 animate-fade-in stagger-2">
              {settings.pickup_info}
            </p>
          )}
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="loading-spinner" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-stone-500 text-lg">No items available this week. Check back soon!</p>
            </div>
          ) : (
            <div className="product-grid" data-testid="products-grid">
              {products.map((product, index) => {
                const isSoldOut = product.quantity <= 0;
                const cartItem = cart.find((item) => item.product_id === product.id);
                const cartQty = cartItem ? cartItem.quantity : 0;
                const availableQty = product.quantity - cartQty;

                return (
                  <div
                    key={product.id}
                    className={`product-card ${isSoldOut ? "sold-out" : ""} animate-slide-up stagger-${(index % 5) + 1}`}
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="relative">
                      {isSoldOut && (
                        <div className="sold-out-badge" data-testid={`sold-out-badge-${product.id}`}>
                          Sold Out
                        </div>
                      )}
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="product-image"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400";
                        }}
                      />
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-heading text-xl font-semibold text-stone-900">
                          {product.name}
                        </h3>
                        <span className="text-lg font-bold text-orange-700">
                          ${product.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-stone-600 text-sm mb-4 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        {!isSoldOut && (
                          <Badge variant="secondary" className="text-xs" data-testid={`stock-badge-${product.id}`}>
                            {availableQty} left
                          </Badge>
                        )}
                        <Button
                          onClick={() => addToCart(product)}
                          disabled={isSoldOut || availableQty <= 0}
                          className={`ml-auto rounded-xl ${isSoldOut ? "bg-stone-400" : "btn-primary text-white"}`}
                          data-testid={`add-to-cart-${product.id}`}
                        >
                          {isSoldOut ? "Sold Out" : cartQty > 0 ? `Add More (${cartQty})` : "Add to Order"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-stone-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-stone-500 text-sm">
            {settings.shop_name || "Weekly Bakery"} &bull; {settings.payment_info}
          </p>
          <a
            href="/admin"
            className="text-stone-400 text-xs hover:text-stone-600 mt-2 inline-block"
            data-testid="admin-link"
          >
            Admin
          </a>
        </div>
      </footer>
    </div>
  );
}
