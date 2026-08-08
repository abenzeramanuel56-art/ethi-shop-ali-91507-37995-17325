import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BannedUserCheck } from "@/components/BannedUserCheck";
import { AdvertisementPlayer } from "@/components/AdvertisementPlayer";
import { MaintenanceWrapper } from "@/components/MaintenanceWrapper";
import { FloatingAbeniAgent } from "@/components/FloatingAbeniAgent";
import { FloatingLanguageSelector } from "@/components/FloatingLanguageSelector";
import AdminMaintenance from "./pages/admin/Maintenance";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Products from "./pages/Products";
import RequestItem from "./pages/RequestItem";
import Download from "./pages/Download";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import Support from "./pages/Support";
import ApplySeller from "./pages/ApplySeller";
import ApplyDriver from "./pages/ApplyDriver";
import ApplicationSubmitted from "./pages/ApplicationSubmitted";
import ApplicationStatus from "./pages/ApplicationStatus";
import Terms from "./pages/Terms";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminApplications from "./pages/admin/Applications";
import AdminSupportTickets from "./pages/admin/SupportTickets";
import AdminAgentConsole from "./pages/admin/AgentConsole";
import AdminServiceOrders from "./pages/admin/ServiceOrders";
import SellerDashboard from "./pages/seller/Dashboard";
import SellerSetup from "./pages/seller/Setup";
import SellerProducts from "./pages/seller/Products";
import SellerOrders from "./pages/seller/Orders";
import SellerWallet from "./pages/seller/Wallet";
import SellerServices from "./pages/seller/Services";
import SellerServiceOrders from "./pages/seller/ServiceOrders";
import SellerDigitalProducts from "./pages/seller/DigitalProducts";
import DriverDashboard from "./pages/driver/Dashboard";
import DriverWallet from "./pages/driver/Wallet";
import Store from "./pages/Store";
import Services from "./pages/Services";
import OrderService from "./pages/OrderService";
import DigitalMarket from "./pages/DigitalMarket";
import AffiliateSetup from "./pages/affiliate/Setup";
import AffiliateDashboard from "./pages/affiliate/Dashboard";
import AffiliatePublicStore from "./pages/affiliate/PublicStore";
import AffiliateCheckout from "./pages/affiliate/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <FloatingAbeniAgent />
        <FloatingLanguageSelector />
        <BannedUserCheck>
          <MaintenanceWrapper>
            <AdvertisementPlayer />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/products" element={<Products />} />
              <Route path="/request-item" element={<RequestItem />} />
              <Route path="/download" element={<Download />} />
              <Route path="/account" element={<Account />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/support" element={<Support />} />
              <Route path="/services" element={<Services />} />
              <Route path="/order-service/:serviceId" element={<OrderService />} />
              <Route path="/apply-seller" element={<ApplySeller />} />
              <Route path="/apply-driver" element={<ApplyDriver />} />
              <Route path="/application-submitted" element={<ApplicationSubmitted />} />
              <Route path="/application-status" element={<ApplicationStatus />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/applications" element={<AdminApplications />} />
              <Route path="/admin/support-tickets" element={<AdminSupportTickets />} />
              <Route path="/admin/agent-console" element={<AdminAgentConsole />} />
              <Route path="/admin/service-orders" element={<AdminServiceOrders />} />
              <Route path="/admin/maintenance" element={<AdminMaintenance />} />
              <Route path="/seller" element={<SellerDashboard />} />
              <Route path="/seller/setup" element={<SellerSetup />} />
              <Route path="/seller/products" element={<SellerProducts />} />
              <Route path="/seller/orders" element={<SellerOrders />} />
              <Route path="/seller/wallet" element={<SellerWallet />} />
              <Route path="/seller/services" element={<SellerServices />} />
              <Route path="/seller/service-orders" element={<SellerServiceOrders />} />
              <Route path="/seller/digital-products" element={<SellerDigitalProducts />} />
              <Route path="/driver" element={<DriverDashboard />} />
              <Route path="/driver/wallet" element={<DriverWallet />} />
              <Route path="/digital-market" element={<DigitalMarket />} />
              <Route path="/affiliate" element={<AffiliateDashboard />} />
              <Route path="/affiliate/setup" element={<AffiliateSetup />} />
              <Route path="/a/:storeSlug" element={<AffiliatePublicStore />} />
              <Route path="/a/:storeSlug/:productId" element={<AffiliateCheckout />} />
              <Route path="/store/:storeSlug" element={<Store />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MaintenanceWrapper>
        </BannedUserCheck>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
