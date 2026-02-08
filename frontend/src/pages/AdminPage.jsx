import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Package,
  Settings,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  Store,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    quantity: "",
    max_quantity: "",
    image_url: "",
    active: true,
  });

  useEffect(() => {
    const savedAuth = sessionStorage.getItem("admin_auth");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await axios.post(`${API}/admin/login?password=${encodeURIComponent(password)}`);
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      toast.success("Welcome to admin panel");
    } catch (error) {
      toast.error("Invalid password");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_auth");
    setPassword("");
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, ordersRes, settingsRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/orders`),
        axios.get(`${API}/settings`),
      ]);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    try {
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        quantity: parseInt(newProduct.quantity),
        max_quantity: parseInt(newProduct.max_quantity),
        image_url: newProduct.image_url,
        active: newProduct.active,
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
        toast.success("Product updated");
      } else {
        await axios.post(`${API}/products`, productData);
        toast.success("Product created");
      }

      setProductDialogOpen(false);
      setEditingProduct(null);
      setNewProduct({
        name: "",
        description: "",
        price: "",
        quantity: "",
        max_quantity: "",
        image_url: "",
        active: true,
      });
      fetchData();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      quantity: product.quantity.toString(),
      max_quantity: product.max_quantity.toString(),
      image_url: product.image_url,
      active: product.active,
    });
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success("Product deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleToggleActive = async (product) => {
    try {
      await axios.put(`${API}/products/${product.id}`, { active: !product.active });
      toast.success(`Product ${!product.active ? "activated" : "deactivated"}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  const handleQuickUpdateQuantity = async (productId, newQuantity) => {
    try {
      await axios.put(`${API}/products/${productId}`, { quantity: newQuantity });
      fetchData();
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await axios.put(`${API}/settings`, settings);
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=${status}`);
      toast.success("Order status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="admin-container flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-sm">
          <div className="admin-card p-8">
            <div className="flex items-center justify-center mb-6">
              <Store className="w-10 h-10 text-orange-700" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-center text-stone-900 mb-6">
              Admin Login
            </h1>
            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <Label htmlFor="password" className="text-stone-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="mt-1 rounded-lg"
                  required
                  data-testid="admin-password-input"
                />
              </div>
              <Button
                type="submit"
                disabled={loginLoading}
                className="btn-primary w-full text-white rounded-xl"
                data-testid="admin-login-btn"
              >
                {loginLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Login"
                )}
              </Button>
            </form>
            <a
              href="/"
              className="block text-center text-stone-500 text-sm mt-4 hover:text-stone-700"
            >
              <ArrowLeft className="w-4 h-4 inline mr-1" />
              Back to Shop
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-orange-700" />
              <h1 className="font-heading text-xl font-bold text-stone-900">
                Admin Panel
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/"
                target="_blank"
                className="text-stone-600 hover:text-stone-900 text-sm flex items-center gap-1"
                data-testid="view-shop-link"
              >
                <Eye className="w-4 h-4" />
                View Shop
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="rounded-lg"
                data-testid="admin-logout-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="loading-spinner" />
          </div>
        ) : (
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="bg-white border border-stone-200 rounded-xl p-1">
              <TabsTrigger value="products" className="rounded-lg" data-testid="tab-products">
                <Package className="w-4 h-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="orders" className="rounded-lg" data-testid="tab-orders">
                <ClipboardList className="w-4 h-4 mr-2" />
                Orders ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products">
              <div className="admin-card">
                <div className="p-6 border-b border-stone-200 flex items-center justify-between">
                  <h2 className="font-heading text-xl font-semibold text-stone-900">
                    Weekly Products
                  </h2>
                  <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          setEditingProduct(null);
                          setNewProduct({
                            name: "",
                            description: "",
                            price: "",
                            quantity: "",
                            max_quantity: "",
                            image_url: "",
                            active: true,
                          });
                        }}
                        className="btn-primary text-white rounded-xl"
                        data-testid="add-product-btn"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md" data-testid="product-dialog">
                      <DialogHeader>
                        <DialogTitle className="font-heading">
                          {editingProduct ? "Edit Product" : "Add New Product"}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={newProduct.name}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, name: e.target.value })
                            }
                            placeholder="Sourdough Loaf"
                            className="mt-1 rounded-lg"
                            data-testid="product-name-input"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={newProduct.description}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, description: e.target.value })
                            }
                            placeholder="Freshly baked with organic flour..."
                            className="mt-1 rounded-lg"
                            rows={2}
                            data-testid="product-description-input"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Price ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={newProduct.price}
                              onChange={(e) =>
                                setNewProduct({ ...newProduct, price: e.target.value })
                              }
                              placeholder="12.00"
                              className="mt-1 rounded-lg"
                              data-testid="product-price-input"
                            />
                          </div>
                          <div>
                            <Label>Image URL</Label>
                            <Input
                              value={newProduct.image_url}
                              onChange={(e) =>
                                setNewProduct({ ...newProduct, image_url: e.target.value })
                              }
                              placeholder="https://..."
                              className="mt-1 rounded-lg"
                              data-testid="product-image-input"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Available Qty</Label>
                            <Input
                              type="number"
                              value={newProduct.quantity}
                              onChange={(e) =>
                                setNewProduct({ ...newProduct, quantity: e.target.value })
                              }
                              placeholder="10"
                              className="mt-1 rounded-lg"
                              data-testid="product-quantity-input"
                            />
                          </div>
                          <div>
                            <Label>Max Qty (sell-out limit)</Label>
                            <Input
                              type="number"
                              value={newProduct.max_quantity}
                              onChange={(e) =>
                                setNewProduct({ ...newProduct, max_quantity: e.target.value })
                              }
                              placeholder="10"
                              className="mt-1 rounded-lg"
                              data-testid="product-max-quantity-input"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newProduct.active}
                            onCheckedChange={(checked) =>
                              setNewProduct({ ...newProduct, active: checked })
                            }
                            data-testid="product-active-switch"
                          />
                          <Label>Active (visible in shop)</Label>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setProductDialogOpen(false)}
                            className="flex-1 rounded-xl"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveProduct}
                            className="btn-primary flex-1 text-white rounded-xl"
                            data-testid="save-product-btn"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                {products.length === 0 ? (
                  <div className="p-12 text-center">
                    <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500">No products yet. Add your first item!</p>
                  </div>
                ) : (
                  <Table data-testid="products-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  e.target.src = "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100";
                                }}
                              />
                              <div>
                                <p className="font-medium text-stone-900">{product.name}</p>
                                <p className="text-sm text-stone-500 truncate max-w-[200px]">
                                  {product.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${product.price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={product.quantity}
                                onChange={(e) =>
                                  handleQuickUpdateQuantity(product.id, parseInt(e.target.value))
                                }
                                className="w-16 h-8 text-center rounded-lg"
                                min="0"
                                data-testid={`product-qty-${product.id}`}
                              />
                              <span className="text-stone-500 text-sm">
                                / {product.max_quantity}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.quantity <= 0 ? (
                              <Badge variant="destructive" className="bg-red-100 text-red-700">
                                Sold Out
                              </Badge>
                            ) : product.active ? (
                              <Badge className="bg-green-100 text-green-700">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(product)}
                                title={product.active ? "Hide" : "Show"}
                                data-testid={`toggle-active-${product.id}`}
                              >
                                {product.active ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                data-testid={`edit-product-${product.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`delete-product-${product.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <div className="admin-card">
                <div className="p-6 border-b border-stone-200">
                  <h2 className="font-heading text-xl font-semibold text-stone-900">
                    Recent Orders
                  </h2>
                </div>
                
                {orders.length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500">No orders yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200" data-testid="orders-list">
                    {orders.map((order) => (
                      <div key={order.id} className="p-6" data-testid={`order-${order.id}`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-stone-900">
                                {order.customer_name}
                              </h3>
                              <Badge
                                className={
                                  order.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : order.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-stone-600">{order.email}</p>
                            <p className="text-sm text-stone-600">{order.phone}</p>
                            {order.notes && (
                              <p className="text-sm text-stone-500 mt-2 italic">
                                "{order.notes}"
                              </p>
                            )}
                            <div className="mt-3 space-y-1">
                              {order.items.map((item, idx) => (
                                <p key={idx} className="text-sm text-stone-700">
                                  {item.quantity}x {item.product_name} - ${(item.price * item.quantity).toFixed(2)}
                                </p>
                              ))}
                              <p className="font-medium text-stone-900 mt-2">
                                Total: ${order.total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:items-end">
                            <p className="text-xs text-stone-500">
                              {new Date(order.created_at).toLocaleString()}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                disabled={order.status === "completed"}
                                className="rounded-lg text-green-700"
                                data-testid={`complete-order-${order.id}`}
                              >
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                disabled={order.status === "cancelled"}
                                className="rounded-lg text-red-700"
                                data-testid={`cancel-order-${order.id}`}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="admin-card">
                <div className="p-6 border-b border-stone-200">
                  <h2 className="font-heading text-xl font-semibold text-stone-900">
                    Shop Settings
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <Label className="text-stone-700">Shop Name</Label>
                    <Input
                      value={settings.shop_name || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, shop_name: e.target.value })
                      }
                      placeholder="Weekly Bakery"
                      className="mt-1 rounded-lg"
                      data-testid="settings-shop-name"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700">Weekly Date / Title</Label>
                    <Input
                      value={settings.weekly_date || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, weekly_date: e.target.value })
                      }
                      placeholder="Saturday, January 15th"
                      className="mt-1 rounded-lg"
                      data-testid="settings-weekly-date"
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      Displayed at the top of your shop (e.g., "Orders for Saturday pickup")
                    </p>
                  </div>
                  <div>
                    <Label className="text-stone-700">Pickup Information</Label>
                    <Textarea
                      value={settings.pickup_info || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, pickup_info: e.target.value })
                      }
                      placeholder="Pickup available Saturday 10am-2pm at 123 Main Street"
                      className="mt-1 rounded-lg"
                      rows={2}
                      data-testid="settings-pickup-info"
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      Included in order confirmation emails
                    </p>
                  </div>
                  <div>
                    <Label className="text-stone-700">Payment Information</Label>
                    <Textarea
                      value={settings.payment_info || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, payment_info: e.target.value })
                      }
                      placeholder="Payment via Venmo @bakery or cash at pickup"
                      className="mt-1 rounded-lg"
                      rows={2}
                      data-testid="settings-payment-info"
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      Included in order confirmation emails
                    </p>
                  </div>
                  <div>
                    <Label className="text-stone-700">Email Message</Label>
                    <Textarea
                      value={settings.email_message || ""}
                      onChange={(e) =>
                        setSettings({ ...settings, email_message: e.target.value })
                      }
                      placeholder="Thank you for your order! We look forward to seeing you."
                      className="mt-1 rounded-lg"
                      rows={3}
                      data-testid="settings-email-message"
                    />
                    <p className="text-xs text-stone-500 mt-1">
                      Custom message included in order confirmation emails
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="btn-primary text-white rounded-xl"
                    data-testid="save-settings-btn"
                  >
                    {savingSettings ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Settings
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
