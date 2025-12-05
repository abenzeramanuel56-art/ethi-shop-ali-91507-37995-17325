import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'am';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navbar
    'nav.brand': 'AliExpress Ethiopia',
    'nav.browse': 'Browse Products',
    'nav.request': 'Request Item',
    'nav.support': 'Support',
    'nav.admin': 'Admin Panel',
    'nav.reseller': 'Reseller Dashboard',
    'nav.signOut': 'Sign Out',
    'nav.signIn': 'Sign In',
    'nav.account': 'Account',
    'nav.cart': 'Cart',
    
    // Language selector
    'lang.select': 'Language',
    'lang.en': 'English',
    'lang.am': 'አማርኛ',
    
    // Home page
    'home.hero.title': 'Shop from AliExpress with Ethiopian Birr',
    'home.hero.subtitle': 'The easiest way to order products from AliExpress delivered to Ethiopia',
    'home.hero.browse': 'Browse Products',
    'home.hero.request': 'Request Custom Item',
    'home.features.title': 'Why Shop With Us?',
    'home.features.delivery': 'Fast Delivery',
    'home.features.deliveryDesc': 'Quick delivery across Ethiopia',
    'home.features.payment': 'Local Payment',
    'home.features.paymentDesc': 'Pay with CBE or Telebirr',
    'home.features.support': '24/7 Support',
    'home.features.supportDesc': 'Customer support in Amharic & English',
    'home.features.secure': 'Secure Shopping',
    'home.features.secureDesc': 'Safe and secure transactions',
    'home.reseller.title': 'Become a Reseller',
    'home.reseller.subtitle': 'Start your own store and earn profits',
    'home.reseller.apply': 'Apply Now',
    
    // Products page
    'products.title': 'Browse Products',
    'products.subtitle': 'Curated selection of popular AliExpress products',
    'products.search': 'Search products...',
    'products.showing': 'Showing',
    'products.of': 'of',
    'products.products': 'products',
    'products.noProducts': 'No products available yet. Check back soon!',
    'products.noMatch': 'No products found matching your filters',
    'products.clearFilters': 'Clear Filters',
    'products.freeShipping': 'Free Shipping',
    'products.hotDeal': 'Hot Deal',
    'products.addToCart': 'Add to Cart',
    'products.buyNow': 'Buy Now',
    'products.cart': 'Cart',
    
    // Filters
    'filters.title': 'Filters',
    'filters.categories': 'Categories',
    'filters.priceRange': 'Price Range',
    'filters.freeShipping': 'Free Shipping Only',
    'filters.reset': 'Reset Filters',
    'filters.electronics': 'Electronics',
    'filters.fashion': 'Fashion',
    'filters.home': 'Home',
    'filters.beauty': 'Beauty',
    'filters.sports': 'Sports',
    'filters.toys': 'Toys',
    'filters.automotive': 'Automotive',
    'filters.other': 'Other',
    
    // Cart page
    'cart.title': 'Shopping Cart',
    'cart.empty': 'Your cart is empty',
    'cart.browseProducts': 'Browse Products',
    'cart.items': 'Cart Items',
    'cart.checkout': 'Checkout',
    'cart.shippingAddress': 'Shipping Address',
    'cart.city': 'City',
    'cart.phone': 'Phone',
    'cart.paymentMethod': 'Payment Method',
    'cart.selectPayment': 'Select payment method',
    'cart.cbe': 'CBE (Commercial Bank of Ethiopia)',
    'cart.telebirr': 'Telebirr',
    'cart.paymentInstructions': 'Payment Instructions:',
    'cart.transferAmount': 'Transfer the total amount to:',
    'cart.paymentProof': 'Payment Proof (Optional)',
    'cart.uploadScreenshot': 'Upload a screenshot of your payment confirmation',
    'cart.total': 'Total:',
    'cart.placeOrder': 'Place Order',
    'cart.fillShipping': 'Please fill in all shipping information',
    'cart.selectPaymentMethod': 'Please select a payment method',
    'cart.emptyCart': 'Your cart is empty',
    'cart.orderSuccess': 'Order placed successfully!',
    'cart.orderFailed': 'Failed to place order',
    'cart.itemRemoved': 'Item removed from cart',
    'cart.via': 'via',
    
    // Store page
    'store.loading': 'Loading store...',
    'store.notFound': 'Store Not Found',
    'store.notFoundDesc': 'This store does not exist',
    'store.contact': 'Contact',
    'store.searchProducts': 'Search products...',
    'store.noProducts': 'No products available',
    'store.noProductsFound': 'No products found',
    'store.addedToCart': 'Added to Cart',
    'store.addedToCartDesc': 'added to cart',
    'store.report': 'Report Store',
    'store.updateImage': 'Update Image',
    'store.uploading': 'Uploading...',
    'store.code': 'Code',
    
    // Auth page
    'auth.signIn': 'Sign In',
    'auth.signUp': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.enterEmail': 'Enter your email',
    'auth.enterPassword': 'Enter your password',
    'auth.enterFullName': 'Enter your full name',
    'auth.signInButton': 'Sign In',
    'auth.signUpButton': 'Sign Up',
    'auth.noAccount': "Don't have an account?",
    'auth.haveAccount': 'Already have an account?',
    'auth.welcome': 'Welcome to AliExpress Ethiopia',
    'auth.signInDesc': 'Sign in to your account to continue shopping',
    'auth.signUpDesc': 'Create an account to start shopping',
    
    // Account page
    'account.title': 'My Account',
    'account.profile': 'Profile',
    'account.orders': 'My Orders',
    'account.fullName': 'Full Name',
    'account.phone': 'Phone Number',
    'account.shippingAddress': 'Shipping Address',
    'account.city': 'City',
    'account.save': 'Save Changes',
    'account.saving': 'Saving...',
    'account.saved': 'Profile updated successfully',
    'account.noOrders': 'No orders yet',
    'account.orderStatus': 'Status',
    'account.orderTotal': 'Total',
    'account.orderDate': 'Date',
    
    // Support page
    'support.title': 'Customer Support',
    'support.newTicket': 'Create New Ticket',
    'support.myTickets': 'My Tickets',
    'support.category': 'Category',
    'support.selectCategory': 'Select a category',
    'support.subject': 'Subject',
    'support.message': 'Message',
    'support.submit': 'Submit Ticket',
    'support.submitting': 'Submitting...',
    'support.noTickets': 'No support tickets yet',
    'support.ticketCreated': 'Support ticket created successfully',
    
    // Reseller
    'reseller.dashboard': 'Reseller Dashboard',
    'reseller.myStore': 'My Store',
    'reseller.products': 'Products',
    'reseller.orders': 'Orders',
    'reseller.wallet': 'Wallet',
    'reseller.setup': 'Store Setup',
    'reseller.earnings': 'Total Earnings',
    'reseller.balance': 'Current Balance',
    'reseller.withdraw': 'Withdraw',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.etb': 'ETB',
  },
  am: {
    // Navbar
    'nav.brand': 'አሊኤክስፕረስ ኢትዮጵያ',
    'nav.browse': 'ምርቶችን ይመልከቱ',
    'nav.request': 'ዕቃ ይጠይቁ',
    'nav.support': 'ድጋፍ',
    'nav.admin': 'አስተዳዳሪ ፓነል',
    'nav.reseller': 'የሻጭ ዳሽቦርድ',
    'nav.signOut': 'ውጣ',
    'nav.signIn': 'ግባ',
    'nav.account': 'መለያ',
    'nav.cart': 'ጋሪ',
    
    // Language selector
    'lang.select': 'ቋንቋ',
    'lang.en': 'English',
    'lang.am': 'አማርኛ',
    
    // Home page
    'home.hero.title': 'በኢትዮጵያ ብር ከአሊኤክስፕረስ ይግዙ',
    'home.hero.subtitle': 'ከአሊኤክስፕረስ ምርቶችን ወደ ኢትዮጵያ ለማስመጣት ቀላሉ መንገድ',
    'home.hero.browse': 'ምርቶችን ይመልከቱ',
    'home.hero.request': 'ዕቃ ይጠይቁ',
    'home.features.title': 'ለምን ከኛ ይገዙ?',
    'home.features.delivery': 'ፈጣን ማድረስ',
    'home.features.deliveryDesc': 'በኢትዮጵያ ውስጥ ፈጣን ማድረስ',
    'home.features.payment': 'የአገር ውስጥ ክፍያ',
    'home.features.paymentDesc': 'በCBE ወይም ቴሌብር ይክፈሉ',
    'home.features.support': '24/7 ድጋፍ',
    'home.features.supportDesc': 'በአማርኛ እና በእንግሊዝኛ የደንበኛ ድጋፍ',
    'home.features.secure': 'ደህንነቱ የተጠበቀ ግዢ',
    'home.features.secureDesc': 'ደህንነቱ የተጠበቀ ግብይቶች',
    'home.reseller.title': 'ሻጭ ይሁኑ',
    'home.reseller.subtitle': 'የራስዎን መደብር ይክፈቱ እና ትርፍ ያግኙ',
    'home.reseller.apply': 'አሁን ያመልክቱ',
    
    // Products page
    'products.title': 'ምርቶችን ይመልከቱ',
    'products.subtitle': 'የተመረጡ የአሊኤክስፕረስ ምርቶች',
    'products.search': 'ምርቶችን ይፈልጉ...',
    'products.showing': 'እያሳየ',
    'products.of': 'ከ',
    'products.products': 'ምርቶች',
    'products.noProducts': 'ገና ምርቶች የሉም። በቅርቡ ይመልከቱ!',
    'products.noMatch': 'ከማጣሪያዎ ጋር የሚዛመድ ምርት አልተገኘም',
    'products.clearFilters': 'ማጣሪያዎችን ያጽዱ',
    'products.freeShipping': 'ነፃ ማጓጓዣ',
    'products.hotDeal': 'ጥሩ ቅናሽ',
    'products.addToCart': 'ወደ ጋሪ ጨምር',
    'products.buyNow': 'አሁን ግዛ',
    'products.cart': 'ጋሪ',
    
    // Filters
    'filters.title': 'ማጣሪያዎች',
    'filters.categories': 'ምድቦች',
    'filters.priceRange': 'የዋጋ ክልል',
    'filters.freeShipping': 'ነፃ ማጓጓዣ ብቻ',
    'filters.reset': 'ማጣሪያዎችን ዳግም አስጀምር',
    'filters.electronics': 'ኤሌክትሮኒክስ',
    'filters.fashion': 'ፋሽን',
    'filters.home': 'ቤት',
    'filters.beauty': 'ውበት',
    'filters.sports': 'ስፖርት',
    'filters.toys': 'መጫወቻዎች',
    'filters.automotive': 'መኪና',
    'filters.other': 'ሌላ',
    
    // Cart page
    'cart.title': 'የግዢ ጋሪ',
    'cart.empty': 'ጋሪዎ ባዶ ነው',
    'cart.browseProducts': 'ምርቶችን ይመልከቱ',
    'cart.items': 'በጋሪ ውስጥ ያሉ ዕቃዎች',
    'cart.checkout': 'ይክፈሉ',
    'cart.shippingAddress': 'የመላኪያ አድራሻ',
    'cart.city': 'ከተማ',
    'cart.phone': 'ስልክ',
    'cart.paymentMethod': 'የክፍያ ዘዴ',
    'cart.selectPayment': 'የክፍያ ዘዴ ይምረጡ',
    'cart.cbe': 'CBE (የኢትዮጵያ ንግድ ባንክ)',
    'cart.telebirr': 'ቴሌብር',
    'cart.paymentInstructions': 'የክፍያ መመሪያ:',
    'cart.transferAmount': 'ጠቅላላ ገንዘቡን ወደዚህ ያስተላልፉ:',
    'cart.paymentProof': 'የክፍያ ማረጋገጫ (አማራጭ)',
    'cart.uploadScreenshot': 'የክፍያ ማረጋገጫ ስክሪንሾት ይስቀሉ',
    'cart.total': 'ጠቅላላ:',
    'cart.placeOrder': 'ትዕዛዝ ያስገቡ',
    'cart.fillShipping': 'እባክዎ ሁሉንም የመላኪያ መረጃ ይሙሉ',
    'cart.selectPaymentMethod': 'እባክዎ የክፍያ ዘዴ ይምረጡ',
    'cart.emptyCart': 'ጋሪዎ ባዶ ነው',
    'cart.orderSuccess': 'ትዕዛዝ በተሳካ ሁኔታ ተልኳል!',
    'cart.orderFailed': 'ትዕዛዝ መላክ አልተሳካም',
    'cart.itemRemoved': 'ዕቃ ከጋሪ ተወግዷል',
    'cart.via': 'በ',
    
    // Store page
    'store.loading': 'መደብር በመጫን ላይ...',
    'store.notFound': 'መደብር አልተገኘም',
    'store.notFoundDesc': 'ይህ መደብር የለም',
    'store.contact': 'አግኙን',
    'store.searchProducts': 'ምርቶችን ይፈልጉ...',
    'store.noProducts': 'ምርቶች የሉም',
    'store.noProductsFound': 'ምርቶች አልተገኙም',
    'store.addedToCart': 'ወደ ጋሪ ተጨምሯል',
    'store.addedToCartDesc': 'ወደ ጋሪ ተጨምሯል',
    'store.report': 'መደብር ሪፖርት አድርግ',
    'store.updateImage': 'ምስል አዘምን',
    'store.uploading': 'በመስቀል ላይ...',
    'store.code': 'ኮድ',
    
    // Auth page
    'auth.signIn': 'ግባ',
    'auth.signUp': 'ተመዝገብ',
    'auth.email': 'ኢሜይል',
    'auth.password': 'የይለፍ ቃል',
    'auth.fullName': 'ሙሉ ስም',
    'auth.enterEmail': 'ኢሜይልዎን ያስገቡ',
    'auth.enterPassword': 'የይለፍ ቃልዎን ያስገቡ',
    'auth.enterFullName': 'ሙሉ ስምዎን ያስገቡ',
    'auth.signInButton': 'ግባ',
    'auth.signUpButton': 'ተመዝገብ',
    'auth.noAccount': 'መለያ የለዎትም?',
    'auth.haveAccount': 'መለያ አለዎት?',
    'auth.welcome': 'ወደ አሊኤክስፕረስ ኢትዮጵያ እንኳን በደህና መጡ',
    'auth.signInDesc': 'ግዢ ለመቀጠል ወደ መለያዎ ይግቡ',
    'auth.signUpDesc': 'ግዢ ለመጀመር መለያ ይፍጠሩ',
    
    // Account page
    'account.title': 'የኔ መለያ',
    'account.profile': 'መገለጫ',
    'account.orders': 'ትዕዛዞቼ',
    'account.fullName': 'ሙሉ ስም',
    'account.phone': 'ስልክ ቁጥር',
    'account.shippingAddress': 'የመላኪያ አድራሻ',
    'account.city': 'ከተማ',
    'account.save': 'ለውጦችን አስቀምጥ',
    'account.saving': 'በማስቀመጥ ላይ...',
    'account.saved': 'መገለጫ በተሳካ ሁኔታ ተዘምኗል',
    'account.noOrders': 'ገና ትዕዛዞች የሉም',
    'account.orderStatus': 'ሁኔታ',
    'account.orderTotal': 'ጠቅላላ',
    'account.orderDate': 'ቀን',
    
    // Support page
    'support.title': 'የደንበኛ ድጋፍ',
    'support.newTicket': 'አዲስ ቲኬት ፍጠር',
    'support.myTickets': 'ቲኬቶቼ',
    'support.category': 'ምድብ',
    'support.selectCategory': 'ምድብ ይምረጡ',
    'support.subject': 'ርዕሰ ጉዳይ',
    'support.message': 'መልዕክት',
    'support.submit': 'ቲኬት ላክ',
    'support.submitting': 'በመላክ ላይ...',
    'support.noTickets': 'ገና የድጋፍ ቲኬቶች የሉም',
    'support.ticketCreated': 'የድጋፍ ቲኬት በተሳካ ሁኔታ ተፈጥሯል',
    
    // Reseller
    'reseller.dashboard': 'የሻጭ ዳሽቦርድ',
    'reseller.myStore': 'የኔ መደብር',
    'reseller.products': 'ምርቶች',
    'reseller.orders': 'ትዕዛዞች',
    'reseller.wallet': 'ኪስ',
    'reseller.setup': 'የመደብር ማዋቀር',
    'reseller.earnings': 'ጠቅላላ ገቢ',
    'reseller.balance': 'የአሁኑ ቀሪ ሂሳብ',
    'reseller.withdraw': 'አውጣ',
    
    // Common
    'common.loading': 'በመጫን ላይ...',
    'common.error': 'ስህተት',
    'common.success': 'ተሳክቷል',
    'common.cancel': 'ሰርዝ',
    'common.confirm': 'አረጋግጥ',
    'common.save': 'አስቀምጥ',
    'common.delete': 'ሰርዝ',
    'common.edit': 'አርትዕ',
    'common.view': 'ይመልከቱ',
    'common.back': 'ተመለስ',
    'common.next': 'ቀጣይ',
    'common.previous': 'ቀዳሚ',
    'common.etb': 'ብር',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
