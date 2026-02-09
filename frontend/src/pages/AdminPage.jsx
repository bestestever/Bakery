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
  Archive,
  BarChart3,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedDates, setExpandedDates] = useState({});

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    active: true,
    availability: [],
  });

  const [newDateAvail, setNewDateAvail] = useState({
    date: "",
    quantity: "",
    max_quantity: "",
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
      const [productsRes, ordersRes, archivedRes, settingsRes, statsRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/orders?archived=false`),
        axios.get(`${API}/orders?archived=true`),
        axios.get(`${API}/settings`),
        axios.get(`${API}/orders/stats`),
      ]);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
      setArchivedOrders(archivedRes.data);
      setSettings(settingsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDateAvailability = () => {
    if (!newDateAvail.date || !newDateAvail.quantity || !newDateAvail.max_quantity) {
      toast.error("Please fill in all date availability fields");
      return;
    }
    
    const exists = newProduct.availability.find(a => a.date === newDateAvail.date);
    if (exists) {
      toast.error("This date already exists");
      return;
    }

    setNewProduct({
      ...newProduct,
      availability: [
        ...newProduct.availability,
        {
          date: newDateAvail.date,
          quantity: parseInt(newDateAvail.quantity),
          max_quantity: parseInt(newDateAvail.max_quantity),
        },
      ],
    });
    setNewDateAvail({ date: "", quantity: "", max_quantity: "" });
  };

  const handleRemoveDateAvailability = (date) => {
    setNewProduct({
      ...newProduct,
      availability: newProduct.availability.filter(a => a.date !== date),
    });
  };

  const handleUpdateDateQuantity = (date, field, value) => {
    setNewProduct({
      ...newProduct,
      availability: newProduct.availability.map(a => 
        a.date === date ? { ...a, [field]: parseInt(value) || 0 } : a
      ),
    });
  };

  const handleSaveProduct = async () => {
    try {
      const productData = {
        name: newProduct.name,
        description: newProduct.description,
        price: parseFloat(newProduct.price),
        image_url: newProduct.image_url,
        active: newProduct.active,
        availability: newProduct.availability,
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
        image_url: "",
        active: true,
        availability: [],
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
      image_url: product.image_url,
      active: product.active,
      availability: product.availability || [],
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

  const handleArchiveOrder = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/archive`);
      toast.success("Order archived");
      fetchData();
    } catch (error) {
      toast.error("Failed to archive order");
    }
  };

  const handleUnarchiveOrder = async (orderId) => {
    try {
      await axios.put(`${API}/orders/${orderId}/unarchive`);
      toast.success("Order restored");
      fetchData();
    } catch (error) {
      toast.error("Failed to restore order");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to permanently delete this order?")) return;
    
    try {
      await axios.delete(`${API}/orders/${orderId}`);
      toast.success("Order deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete order");
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder({ ...order });
    setOrderDialogOpen(true);
  };

  const handleSaveOrder = async () => {
    try {
      await axios.put(`${API}/orders/${editingOrder.id}`, {
        customer_name: editingOrder.customer_name,
        email: editingOrder.email,
        phone: editingOrder.phone,
        notes: editingOrder.notes,
        status: editingOrder.status,
      });
      toast.success("Order updated");
      setOrderDialogOpen(false);
      setEditingOrder(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to update order");
    }
  };

  const toggleDateExpanded = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Group orders by pickup date
  const groupOrdersByPickupDate = (ordersList) => {
    const grouped = {};
    ordersList.forEach((order) => {
      const date = order.pickup_date || "Unknown";
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });
    return grouped;
  };

  const groupedOrders = groupOrdersByPickupDate(showArchived ? archivedOrders : orders);

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "Unknown") return dateStr;
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Get total quantity across all dates for a product
  const getTotalQuantity = (product) => {
    if (!product.availability || product.availability.length === 0) return 0;
    return product.availability.reduce((sum, a) => sum + a.quantity, 0);
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
              <TabsTrigger value="stats" className="rounded-lg" data-testid="tab-stats">
                <BarChart3 className="w-4 h-4 mr-2" />
                Stats
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
                    Products
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
                            image_url: "",
                            active: true,
                            availability: [],
                          });
                        }}
                        className="btn-primary text-white rounded-xl"
                        data-testid="add-product-btn"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="product-dialog">
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
                        
                        {/* Date Availability Section */}
                        <div className="border-t pt-4 mt-4">
                          <Label className="text-base font-semibold">Date Availability</Label>
                          <p className="text-xs text-stone-500 mb-3">Add dates when this item is available and set quantities for each date</p>
                          
                          {/* Existing dates */}
                          {newProduct.availability.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {newProduct.availability
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .map((avail) => (
                                <div key={avail.date} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg">
                                  <span className="text-sm font-medium min-w-[100px]">
                                    {formatDate(avail.date)}
                                  </span>
                                  <Input
                                    type="number"
                                    value={avail.quantity}
                                    onChange={(e) => handleUpdateDateQuantity(avail.date, "quantity", e.target.value)}
                                    className="w-20 h-8 text-center rounded"
                                    min="0"
                                    data-testid={`avail-qty-${avail.date}`}
                                  />
                                  <span className="text-stone-500">/</span>
                                  <Input
                                    type="number"
                                    value={avail.max_quantity}
                                    onChange={(e) => handleUpdateDateQuantity(avail.date, "max_quantity", e.target.value)}
                                    className="w-20 h-8 text-center rounded"
                                    min="0"
                                    data-testid={`avail-max-${avail.date}`}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveDateAvailability(avail.date)}
                                    className="text-red-600 h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Add new date */}
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label className="text-xs">Date</Label>
                              <Input
                                type="date"
                                value={newDateAvail.date}
                                onChange={(e) => setNewDateAvail({ ...newDateAvail, date: e.target.value })}
                                className="mt-1 rounded-lg"
                                data-testid="new-avail-date"
                              />
                            </div>
                            <div className="w-20">
                              <Label className="text-xs">Qty</Label>
                              <Input
                                type="number"
                                value={newDateAvail.quantity}
                                onChange={(e) => setNewDateAvail({ ...newDateAvail, quantity: e.target.value })}
                                placeholder="10"
                                className="mt-1 rounded-lg"
                                data-testid="new-avail-qty"
                              />
                            </div>
                            <div className="w-20">
                              <Label className="text-xs">Max</Label>
                              <Input
                                type="number"
                                value={newDateAvail.max_quantity}
                                onChange={(e) => setNewDateAvail({ ...newDateAvail, max_quantity: e.target.value })}
                                placeholder="10"
                                className="mt-1 rounded-lg"
                                data-testid="new-avail-max"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddDateAvailability}
                              className="rounded-lg"
                              data-testid="add-date-btn"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
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
                        <TableHead>Dates & Stock</TableHead>
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
                            {product.availability && product.availability.length > 0 ? (
                              <div className="space-y-1">
                                {product.availability
                                  .sort((a, b) => a.date.localeCompare(b.date))
                                  .map((avail) => (
                                  <div key={avail.date} className="text-xs flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-stone-400" />
                                    <span className="text-stone-600">{avail.date}</span>
                                    <Badge variant={avail.quantity > 0 ? "secondary" : "destructive"} className="text-xs">
                                      {avail.quantity}/{avail.max_quantity}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-stone-400 text-sm">No dates set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getTotalQuantity(product) <= 0 ? (
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
                <div className="p-6 border-b border-stone-200 flex items-center justify-between">
                  <h2 className="font-heading text-xl font-semibold text-stone-900">
                    {showArchived ? "Archived Orders" : "Active Orders"}
                  </h2>
                  <Button
                    variant={showArchived ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className="rounded-lg"
                    data-testid="toggle-archived-btn"
                  >
                    {showArchived ? (
                      <>
                        <ClipboardList className="w-4 h-4 mr-2" />
                        View Active ({orders.length})
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 mr-2" />
                        View Archived ({archivedOrders.length})
                      </>
                    )}
                  </Button>
                </div>
                
                {Object.keys(groupedOrders).length === 0 ? (
                  <div className="p-12 text-center">
                    <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500">
                      {showArchived ? "No archived orders." : "No active orders."}
                    </p>
                  </div>
                ) : (
                  <div data-testid="orders-list">
                    {Object.entries(groupedOrders)
                      .sort((a, b) => b[0].localeCompare(a[0]))
                      .map(([date, dateOrders]) => (
                      <div key={date}>
                        <div className="px-6 py-3 bg-stone-50 border-b border-stone-200 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-stone-500" />
                          <span className="font-medium text-stone-700">{formatDate(date)}</span>
                          <Badge variant="secondary" className="ml-2">
                            {dateOrders.length} order{dateOrders.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="divide-y divide-stone-200">
                          {dateOrders.map((order) => (
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
                                  <div className="flex gap-2 flex-wrap">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditOrder(order)}
                                      className="rounded-lg"
                                      data-testid={`edit-order-${order.id}`}
                                    >
                                      <Pencil className="w-4 h-4 mr-1" />
                                      Edit
                                    </Button>
                                    {!showArchived && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                          disabled={order.status === "completed"}
                                          className="rounded-lg text-green-700"
                                          data-testid={`complete-order-${order.id}`}
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                          disabled={order.status === "cancelled"}
                                          className="rounded-lg text-red-700"
                                          data-testid={`cancel-order-${order.id}`}
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleArchiveOrder(order.id)}
                                          className="rounded-lg"
                                          data-testid={`archive-order-${order.id}`}
                                        >
                                          <Archive className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteOrder(order.id)}
                                          className="rounded-lg text-red-700"
                                          data-testid={`delete-active-order-${order.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                    {showArchived && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleUnarchiveOrder(order.id)}
                                          className="rounded-lg"
                                          data-testid={`unarchive-order-${order.id}`}
                                        >
                                          <ArchiveRestore className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeleteOrder(order.id)}
                                          className="rounded-lg text-red-700"
                                          data-testid={`delete-order-${order.id}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Edit Dialog */}
              <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
                <DialogContent className="sm:max-w-md" data-testid="order-edit-dialog">
                  <DialogHeader>
                    <DialogTitle className="font-heading">Edit Order</DialogTitle>
                  </DialogHeader>
                  {editingOrder && (
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label>Customer Name</Label>
                        <Input
                          value={editingOrder.customer_name}
                          onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={editingOrder.email}
                          onChange={(e) => setEditingOrder({ ...editingOrder, email: e.target.value })}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={editingOrder.phone}
                          onChange={(e) => setEditingOrder({ ...editingOrder, phone: e.target.value })}
                          className="mt-1 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={editingOrder.notes}
                          onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                          className="mt-1 rounded-lg"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <select
                          value={editingOrder.status}
                          onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                          className="w-full mt-1 p-2 border border-stone-200 rounded-lg"
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-stone-700 mb-2">Order Items:</p>
                        {editingOrder.items.map((item, idx) => (
                          <p key={idx} className="text-sm text-stone-600">
                            {item.quantity}x {item.product_name} - ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        ))}
                        <p className="font-medium text-stone-900 mt-2">
                          Total: ${editingOrder.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setOrderDialogOpen(false)}
                          className="flex-1 rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveOrder}
                          className="btn-primary flex-1 text-white rounded-xl"
                          data-testid="save-order-btn"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Stats Tab - Now shows orders grouped by pickup date */}
            <TabsContent value="stats">
              <div className="space-y-6">
                {/* Totals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card data-testid="total-revenue">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Total Revenue
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-stone-900">
                        ${stats?.totals?.total_revenue?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ${stats?.totals?.completed_revenue?.toFixed(2) || "0.00"} completed
                      </p>
                    </CardContent>
                  </Card>
                  <Card data-testid="total-orders">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4" />
                        Total Orders
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-stone-900">
                        {stats?.totals?.total_orders || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card data-testid="completed-orders">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Completed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-green-600">
                        {stats?.totals?.completed_orders || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card data-testid="pending-orders">
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        Pending
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-yellow-600">
                        {stats?.totals?.pending_orders || 0}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {stats?.totals?.cancelled_orders || 0} cancelled
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Orders by Pickup Date */}
                <div>
                  <h2 className="font-heading text-xl font-semibold text-stone-900 mb-4">
                    Orders by Pickup Date
                  </h2>
                  {stats?.by_date?.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                        <p className="text-stone-500">No orders yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {stats?.by_date?.map((dateStats) => (
                        <Card key={dateStats.date}>
                          <Collapsible 
                            open={expandedDates[dateStats.date]} 
                            onOpenChange={() => toggleDateExpanded(dateStats.date)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-stone-50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-orange-700" />
                                    <CardTitle className="text-lg">{formatDate(dateStats.date)}</CardTitle>
                                    <Badge variant="secondary">{dateStats.total_orders} orders</Badge>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <p className="font-bold text-stone-900">${dateStats.total_revenue.toFixed(2)}</p>
                                      <p className="text-xs text-green-600">${dateStats.completed_revenue.toFixed(2)} completed</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Badge className="bg-green-100 text-green-700">{dateStats.completed_orders} done</Badge>
                                      <Badge className="bg-yellow-100 text-yellow-700">{dateStats.pending_orders} pending</Badge>
                                      {dateStats.cancelled_orders > 0 && (
                                        <Badge className="bg-red-100 text-red-700">{dateStats.cancelled_orders} cancelled</Badge>
                                      )}
                                    </div>
                                    {expandedDates[dateStats.date] ? (
                                      <ChevronUp className="w-5 h-5 text-stone-400" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5 text-stone-400" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="pt-0">
                                <div className="border-t border-stone-200 pt-4 space-y-3">
                                  {dateStats.orders.map((order) => (
                                    <div 
                                      key={order.id} 
                                      className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                                      data-testid={`stats-order-${order.id}`}
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{order.customer_name}</span>
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
                                        <p className="text-sm text-stone-600">{order.email} • {order.phone}</p>
                                        <p className="text-sm text-stone-500">
                                          {order.items.map(i => `${i.quantity}x ${i.product_name}`).join(", ")}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="font-bold">${order.total.toFixed(2)}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditOrder(order)}
                                          className="rounded-lg"
                                          data-testid={`stats-edit-order-${order.id}`}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
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
