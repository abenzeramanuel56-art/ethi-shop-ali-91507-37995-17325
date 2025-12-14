import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BannedUserCheck } from "@/components/BannedUserCheck";
import { AdvertisementPlayer } from "@/components/AdvertisementPlayer";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import RequestItem from "./pages/RequestItem";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import Support from "./pages/Support";
import ApplyReseller from "./pages/ApplyReseller";
import ApplicationSubmitted from "./pages/ApplicationSubmitted";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminApplications from "./pages/admin/Applications";
import AdminSupportTickets from "./pages/admin/SupportTickets";
import ResellerDashboard from "./pages/reseller/Dashboard";
import ResellerSetup from "./pages/reseller/Setup";
import ResellerProducts from "./pages/reseller/Products";
import ResellerOrders from "./pages/reseller/Orders";
import ResellerWallet from "./pages/reseller/Wallet";
import Store from "./pages/Store";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BannedUserCheck>
          <AdvertisementPlayer />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/products" element={<Products />} />
            <Route path="/request-item" element={<RequestItem />} />
            <Route path="/account" element={<Account />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/support" element={<Support />} />
            <Route path="/apply-reseller" element={<ApplyReseller />} />
            <Route path="/application-submitted" element={<ApplicationSubmitted />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/applications" element={<AdminApplications />} />
            <Route path="/admin/support-tickets" element={<AdminSupportTickets />} />
            <Route path="/reseller" element={<ResellerDashboard />} />
            <Route path="/reseller/setup" element={<ResellerSetup />} />
            <Route path="/reseller/products" element={<ResellerProducts />} />
            <Route path="/reseller/orders" element={<ResellerOrders />} />
            <Route path="/reseller/wallet" element={<ResellerWallet />} />
            <Route path="/store/:storeSlug" element={<Store />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BannedUserCheck>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;