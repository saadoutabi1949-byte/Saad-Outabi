import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  ShoppingBag,
  Search,
  Truck,
  ArrowUpRight,
  Menu,
  X,
  Plus,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  auth,
  db,
  testConnection,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  CATALOG_PRODUCTS,
  CatalogProduct,
  HERO_CAMPAIGN_IMAGE,
  BRAND_LOGO_IMAGE,
} from './data/catalog';
import {
  CartItem,
  OrderRecord,
  UserPrivateInfoRecord,
  UserProfileRecord,
} from './types';
import { ensureUserProfileAndPrivateInfo } from './services/storeService';
import { ResilientImage } from './components/ResilientImage';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CheckoutDrawer } from './components/CheckoutDrawer';
import { OrderTrackingCenter } from './components/OrderTrackingCenter';
import { AccountProfileView } from './components/AccountProfileView';

type ActiveView = 'store' | 'tracking' | 'account';
type CategoryFilter = 'All' | 'Sneakers' | 'Apparel';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('store');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checkingPieceId, setCheckingPieceId] = useState<string | null>(null);

  // Auth & Profile State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [userPrivateInfo, setUserPrivateInfo] = useState<UserPrivateInfoRecord | null>(null);

  // Cart & Modals State
  const [cart, setCart] = useState<CartItem[]>([
    {
      product: CATALOG_PRODUCTS[0],
      size: 'M',
      colorway: CATALOG_PRODUCTS[0].colorways[0],
      quantity: 1,
    },
  ]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Real-Time Orders State
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Validate connection to Firestore on boot
  useEffect(() => {
    testConnection();
  }, []);

  const refreshProfileData = useCallback(async (currentUser: User) => {
    const { profile, privateInfo } = await ensureUserProfileAndPrivateInfo(currentUser);
    setUserProfile(profile);
    setUserPrivateInfo(privateInfo);
  }, []);

  // Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        try {
          await refreshProfileData(currentUser);
        } catch (err) {
          console.error('Profile sync error:', err);
        }
      } else {
        setUserProfile(null);
        setUserPrivateInfo(null);
        setOrders([]);
      }
    });
    return () => unsub();
  }, [refreshProfileData]);

  // Real-Time Orders Listener (Pillar 8 Query Enforcer compliant)
  useEffect(() => {
    if (!authReady || !user) {
      setOrders([]);
      return;
    }

    const ordersQ = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsub = onSnapshot(
      ordersQ,
      (snap) => {
        const list: OrderRecord[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<OrderRecord, 'id'>),
          }))
          .sort((a, b) => {
            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tB - tA;
          });
        setOrders(list);
        if (list.length > 0 && !selectedOrderId) {
          setSelectedOrderId(list[0].id);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, 'orders');
      }
    );

    return () => unsub();
  }, [authReady, user, selectedOrderId]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign-in cancelled or failed:', err);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setActiveView('store');
  };

  const handleInspectPiece = (product: CatalogProduct) => {
    setCheckingPieceId(product.id);
    setTimeout(() => {
      setSelectedProduct(product);
      setCheckingPieceId(null);
    }, 140);
  };

  const handleAddToBag = (
    product: CatalogProduct,
    size: string,
    colorway: string,
    quantity: number,
    openCheckoutImmediately = false
  ) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.size === size &&
          item.colorway === colorway
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: Math.min(20, updated[existingIdx].quantity + quantity),
        };
        return updated;
      }
      return [...prev, { product, size, colorway, quantity }];
    });

    if (openCheckoutImmediately) {
      setSelectedProduct(null);
      setIsCheckoutOpen(true);
    }
  };

  const handleQuickAdd = (product: CatalogProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultSize =
      product.category === 'Sneakers'
        ? userPrivateInfo?.preferredSizeShoe || 'EU 42'
        : userPrivateInfo?.preferredSizeApparel || 'M';
    handleAddToBag(product, defaultSize, product.colorways[0], 1, true);
  };

  const handleUpdateCartQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const nextQty = updated[index].quantity + delta;
      if (nextQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], quantity: Math.min(20, nextQty) };
      return updated;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOrderCreated = (newOrderId: string) => {
    setIsCheckoutOpen(false);
    setSelectedOrderId(newOrderId);
    setActiveView('tracking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateCategory = (cat: CategoryFilter) => {
    setCategoryFilter(cat);
    setActiveView('store');
    setMobileMenuOpen(false);
    const el = document.getElementById('collection-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredProducts = CATALOG_PRODUCTS.filter((p) => {
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    return 0;
  });

  const totalBagCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeInTransitOrder = orders.find((o) => o.shipmentStatus !== 'Delivered') || orders[0];

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#FBFBF9] text-[#121212]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-16 bg-[#121212] text-[#FBFBF9] border-b border-[#D4AF37]/25 px-4 sm:px-6 lg:px-10 flex items-center justify-between">
        {/* Zone 1: Single Text Element Brand Wordmark in Clear Big Letters */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('store');
            setCategoryFilter('All');
          }}
          className="font-display text-2xl md:text-3xl font-bold tracking-wider text-white whitespace-nowrap shrink-0"
        >
          FRESH_<span className="text-[#D4AF37]">MEN.1</span>
        </a>

        {/* Zone 2: 5 Clean Text Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#D4D3CD]"
        >
          <button
            type="button"
            onClick={() => navigateCategory('All')}
            className={`hover:text-[#D4AF37] transition-colors whitespace-nowrap py-1 ${
              activeView === 'store' && categoryFilter === 'All'
                ? 'text-[#D4AF37] underline underline-offset-8 decoration-1'
                : ''
            }`}
          >
            Collection
          </button>
          <button
            type="button"
            onClick={() => navigateCategory('Apparel')}
            className={`hover:text-[#D4AF37] transition-colors whitespace-nowrap py-1 ${
              activeView === 'store' && categoryFilter === 'Apparel'
                ? 'text-[#D4AF37] underline underline-offset-8 decoration-1'
                : ''
            }`}
          >
            Clothes & Packs
          </button>
          <button
            type="button"
            onClick={() => navigateCategory('Sneakers')}
            className={`hover:text-[#D4AF37] transition-colors whitespace-nowrap py-1 ${
              activeView === 'store' && categoryFilter === 'Sneakers'
                ? 'text-[#D4AF37] underline underline-offset-8 decoration-1'
                : ''
            }`}
          >
            Sneakers
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('tracking');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hover:text-[#D4AF37] transition-colors whitespace-nowrap py-1 ${
              activeView === 'tracking'
                ? 'text-[#D4AF37] underline underline-offset-8 decoration-1'
                : ''
            }`}
          >
            Track Order {orders.length > 0 ? `(${orders.length})` : ''}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView('account');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hover:text-[#D4AF37] transition-colors whitespace-nowrap py-1 ${
              activeView === 'account'
                ? 'text-[#D4AF37] underline underline-offset-8 decoration-1'
                : ''
            }`}
          >
            Account
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <button
              type="button"
              onClick={() => setActiveView('account')}
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-lg border border-white/20 text-xs font-semibold text-white hover:border-[#D4AF37] transition-colors whitespace-nowrap shrink-0 max-w-[160px] truncate"
            >
              {userProfile?.displayName || user.displayName || 'Member Vault'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="hidden sm:inline-flex items-center px-3.5 py-2 rounded-lg border border-white/20 text-xs font-semibold text-white hover:border-[#D4AF37] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#121212] text-xs font-semibold hover:bg-[#e3be42] transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">Bag ({totalBagCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile navigation"
            className="md:hidden p-2 rounded-lg border border-white/20 text-white"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#121212] text-white border-b border-[#D4AF37]/30 px-4 py-5 space-y-3 z-30">
          <div className="flex flex-col space-y-2.5 text-sm font-semibold">
            <button
              type="button"
              onClick={() => navigateCategory('All')}
              className="text-left py-1"
            >
              All Collection
            </button>
            <button
              type="button"
              onClick={() => navigateCategory('Apparel')}
              className="text-left py-1"
            >
              Polos, Tees & Designer Packs
            </button>
            <button
              type="button"
              onClick={() => navigateCategory('Sneakers')}
              className="text-left py-1"
            >
              Sneakers
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('tracking');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1"
            >
              Real-Time Order Tracking ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('account');
                setMobileMenuOpen(false);
              }}
              className="text-left py-1"
            >
              {user ? 'Member Profile & Vault' : 'Sign In with Google'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {activeView === 'tracking' ? (
          <OrderTrackingCenter
            user={user}
            userProfile={userProfile}
            userPrivateInfo={userPrivateInfo}
            orders={orders}
            selectedOrderId={selectedOrderId}
            onSelectOrder={(id) => setSelectedOrderId(id)}
            onSignIn={handleSignIn}
            onBackToStore={() => setActiveView('store')}
          />
        ) : activeView === 'account' ? (
          <AccountProfileView
            user={user}
            userProfile={userProfile}
            userPrivateInfo={userPrivateInfo}
            orders={orders}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onRefreshProfile={async () => {
              if (user) await refreshProfileData(user);
            }}
            onNavigateToOrder={(id) => {
              setSelectedOrderId(id);
              setActiveView('tracking');
            }}
            onBackToStore={() => setActiveView('store')}
          />
        ) : (
          /* Storefront View (3 Curated Sections: Hero -> Collection Grid -> Craftsmanship & Logistics Proof) */
          <div>
            {/* Section 1: Storefront Hero with Big FRESH_MEN.1 Typography, Brand Logo Badge & Featured Articles */}
            <section className="bg-[#121212] text-[#FBFBF9] border-b border-[#D4AF37]/20">
              <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
                {/* Active Order Live Telemetry Strip (if user has an order) */}
                {activeInTransitOrder && (
                  <div className="mb-8 p-3.5 px-5 rounded-xl bg-white/10 border border-[#D4AF37]/30 text-[#FBFBF9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Truck className="w-4 h-4 text-[#D4AF37] shrink-0" />
                      <span className="font-mono font-semibold">
                        {activeInTransitOrder.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeInTransitOrder.shipmentStatus}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#D4D3CD] truncate">
                        {activeInTransitOrder.currentHub} ({activeInTransitOrder.progressPercent}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderId(activeInTransitOrder.id);
                        setActiveView('tracking');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#D4AF37] underline underline-offset-4 hover:text-white whitespace-nowrap self-start sm:self-auto"
                    >
                      <span>Open Live Shipment Telemetry</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                  {/* Left Brand Identity: Official Logo + Big Clear FRESH_MEN.1 Title */}
                  <div className="lg:col-span-6 space-y-6">
                    <div className="flex items-center gap-5">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#D4AF37] shrink-0 bg-black shadow-lg">
                        <ResilientImage
                          src={BRAND_LOGO_IMAGE}
                          alt="FRESH_MEN.1 Official Crown FM Logo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-mono tracking-widest text-[#D4AF37] mb-1">
                          STYLE FOR EVERY MAN
                        </p>
                        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none text-white">
                          FRESH_<span className="text-[#D4AF37]">MEN.1</span>
                        </h1>
                        <p className="text-xs text-[#D4D3CD] mt-2">
                          Casual · Sport · Classic · Sneakers · Accessories
                        </p>
                      </div>
                    </div>

                    <p className="text-base text-[#D4D3CD] leading-relaxed">
                      Discover authentic menswear, Tommy Hilfiger & Under Armour polos, Calvin Klein & Guess essentials packs, and technical sneakers. Every order includes integrated Moroccan Dirham (MAD) checkout and real-time shipment tracking to your door.
                    </p>

                    {/* Primary CTA & Live Order Tracker */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <a
                        href="#collection-grid"
                        className="py-3.5 px-6 rounded-lg bg-[#D4AF37] text-[#121212] text-xs font-semibold tracking-wide hover:bg-[#e3be42] transition-colors whitespace-nowrap"
                      >
                        Shop FRESH_MEN.1 Articles
                      </a>
                      <button
                        type="button"
                        onClick={() => setActiveView('tracking')}
                        className="py-3.5 px-5 rounded-lg border border-white/25 text-white text-xs font-semibold hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 whitespace-nowrap"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Real-Time Order Tracker</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Featured Articles Showcase Grid */}
                  <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                    <motion.div
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInspectPiece(CATALOG_PRODUCTS[2])}
                      className="col-span-2 relative aspect-16/9 rounded-xl overflow-hidden bg-white cursor-pointer border border-[#D4AF37]/30 group"
                    >
                      <ResilientImage
                        src={HERO_CAMPAIGN_IMAGE}
                        alt="Calvin Klein, Tommy Hilfiger, Guess and Michael Kors Collection"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex items-end justify-between p-5 text-white">
                        <div>
                          <p className="text-xs text-[#D4AF37] font-mono">
                            Featured Bundle · 2,490 MAD
                          </p>
                          <h2 className="text-base sm:text-lg font-bold">
                            CK, Tommy Hilfiger, Guess & MK Complete Collection
                          </h2>
                        </div>
                        <span className="text-xs font-semibold underline underline-offset-4 shrink-0">
                          Inspect Pack
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInspectPiece(CATALOG_PRODUCTS[0])}
                      className="relative aspect-square rounded-xl overflow-hidden bg-white cursor-pointer border border-white/15 group"
                    >
                      <ResilientImage
                        src={CATALOG_PRODUCTS[0].imageUrl}
                        alt={CATALOG_PRODUCTS[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 text-white">
                        <p className="text-xs font-semibold truncate">Tommy Hilfiger Black Polo</p>
                        <p className="text-xs font-mono text-[#D4AF37]">890 MAD</p>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInspectPiece(CATALOG_PRODUCTS[1])}
                      className="relative aspect-square rounded-xl overflow-hidden bg-white cursor-pointer border border-white/15 group"
                    >
                      <ResilientImage
                        src={CATALOG_PRODUCTS[1].imageUrl}
                        alt={CATALOG_PRODUCTS[1].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3.5 text-white">
                        <p className="text-xs font-semibold truncate">Under Armour Blue Polo</p>
                        <p className="text-xs font-mono text-[#D4AF37]">750 MAD</p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Featured Collection Grid with Piece Inspection Animations */}
            <section
              id="collection-grid"
              className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16"
            >
              {/* Controls Bar: Segmented Category Filter + Search + Sort */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                  <p className="text-xs text-[#6E6D68] mb-1">
                    FRESH_MEN.1 Official Catalog · Click any piece for animated 3D studio inspection
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#121212]">
                    Featured Polos, Designer Packs & Sneakers
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Functional Segmented Filter Control */}
                  <div className="flex items-center gap-1 p-1 bg-[#F2F1ED] rounded-lg">
                    {(['All', 'Apparel', 'Sneakers'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                          categoryFilter === cat
                            ? 'bg-[#121212] text-[#FBFBF9] shadow-2xs'
                            : 'text-[#5A5955] hover:text-[#121212]'
                        }`}
                      >
                        {cat === 'All' ? 'All Pieces (6)' : cat === 'Apparel' ? 'Clothes & Packs' : 'Sneakers'}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#6E6D68] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Tommy, UA, CK..."
                      className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-black/15 bg-white focus:outline-none focus:border-[#121212] w-44"
                    />
                  </div>

                  {/* Sort Select */}
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')
                    }
                    aria-label="Sort products"
                    className="px-3 py-1.5 text-xs rounded-lg border border-black/15 bg-white text-[#121212] focus:outline-none focus:border-[#121212]"
                  >
                    <option value="featured">Sort: Featured</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                  </select>
                </div>
              </div>

              {/* 3-Column Desktop / 2-Column Tablet Uniform Product Grid with Motion */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product, idx) => {
                    const isChecking = checkingPieceId === product.id;
                    return (
                      <motion.article
                        layout
                        key={product.id}
                        initial={{ opacity: 0, y: 18, scale: 0.97 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: isChecking ? 0.95 : 1,
                          rotateX: isChecking ? 4 : 0,
                        }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        whileHover={{ y: -6, scale: 1.015 }}
                        whileTap={{ scale: 0.96 }}
                        transition={{
                          type: 'spring',
                          stiffness: 340,
                          damping: 26,
                          delay: idx * 0.03,
                        }}
                        onClick={() => handleInspectPiece(product)}
                        className="group cursor-pointer flex flex-col justify-between rounded-xl bg-white border border-black/8 hover:border-black/25 hover:shadow-xl transition-shadow overflow-hidden"
                      >
                        <div>
                          {/* 4:3 Product Image Container with Interactive Inspection Overlay */}
                          <div className="aspect-4/3 w-full bg-white overflow-hidden relative border-b border-black/6">
                            <motion.div
                              whileHover={{ scale: 1.07, rotate: -0.8 }}
                              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                              className="w-full h-full"
                            >
                              <ResilientImage
                                src={product.imageUrl}
                                alt={product.title}
                                category={product.category}
                                className="w-full h-full object-contain p-2"
                              />
                            </motion.div>

                            {/* Animated Hover Inspection Prompt */}
                            <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-150 pointer-events-none flex items-center justify-between px-3 py-2 rounded-lg bg-[#121212]/90 backdrop-blur-xs text-[#FBFBF9] text-xs font-semibold">
                              <span className="inline-flex items-center gap-1.5">
                                <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                                <span>Check Piece in Studio 3D</span>
                              </span>
                              <span className="font-mono text-[11px] text-[#D4AF37]">
                                {product.releaseCode}
                              </span>
                            </div>
                          </div>

                          {/* Card Body with Uniform Field Order & Zero-Pill Metadata */}
                          <div className="p-5">
                            <div className="flex items-center gap-1.5 text-xs text-[#6E6D68] mb-1.5">
                              <span className="font-semibold text-[#121212]">FRESH_MEN.1</span>
                              <span aria-hidden="true">·</span>
                              <span>{product.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{product.releaseCode}</span>
                            </div>

                            <div className="flex items-baseline justify-between gap-3">
                              <h3 className="text-base font-semibold text-[#121212] group-hover:underline underline-offset-4">
                                {product.title}
                              </h3>
                              <span className="text-[15px] font-mono font-semibold tabular-nums text-[#121212] shrink-0">
                                {product.price.toLocaleString()} MAD
                              </span>
                            </div>

                            <p className="text-xs text-[#5A5955] mt-1 line-clamp-2 leading-relaxed">
                              {product.subtitle}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer Action Row */}
                        <div className="px-5 pb-5 pt-3 border-t border-black/6 flex items-center justify-between gap-2">
                          <span className="text-xs text-[#6E6D68] truncate">
                            Sizes: {product.sizes[0]} – {product.sizes[product.sizes.length - 1]}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleQuickAdd(product, e)}
                            className="py-1.5 px-3 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold hover:bg-[#2A2A28] transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Quick Add</span>
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            </section>

            {/* Section 3: Craftsmanship, Real-Time Logistics Architecture & Attributable Proof */}
            <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-t border-black/8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <p className="text-xs text-[#6E6D68]">
                    FRESH_MEN.1 Direct Dispatch · Real-Time Delivery Across Morocco
                  </p>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#121212]">
                    Every Order Tracked in Real Time from Dispatch to Doorstep.
                  </h2>
                  <p className="text-sm text-[#4A4945] leading-relaxed max-w-2xl">
                    Every FRESH_MEN.1 order—from Tommy Hilfiger and Under Armour polos to complete Calvin Klein, Guess, and Michael Kors gift bundles—is linked to a live 6-stage shipment tracker. Follow your parcel in real time from quality verification through local courier delivery.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-black/10">
                    <div>
                      <p className="font-mono text-xl font-semibold tabular-nums text-[#121212]">
                        100% Authentic
                      </p>
                      <p className="text-xs text-[#5A5955] mt-1">
                        Verified brand tags and boxed leather accessories inspected before shipping.
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xl font-semibold tabular-nums text-[#121212]">
                        6 Live Stages
                      </p>
                      <p className="text-xs text-[#5A5955] mt-1">
                        Real-time status updates for every scan from warehouse to your address.
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xl font-semibold tabular-nums text-[#121212]">
                        24–48 Hours
                      </p>
                      <p className="text-xs text-[#5A5955] mt-1">
                        Express courier delivery across Casablanca, Rabat, Marrakech, Tangier, and all Morocco.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attributable Client Testimonial Card */}
                <div className="lg:col-span-5 p-6 md:p-8 rounded-xl bg-[#F3F2EE] border border-black/8 space-y-4">
                  <p className="text-xs text-[#6E6D68]">
                    Verified Client Dispatch Review · Casablanca
                  </p>
                  <blockquote className="text-sm text-[#121212] leading-relaxed">
                    “Ordering the Tommy Hilfiger striped polo and the Calvin Klein & Guess gift bundle on FRESH_MEN.1 was seamless. As soon as I completed checkout in MAD, my live tracking waybill updated through every stage and arrived in Casablanca in 24 hours.”
                  </blockquote>
                  <div className="pt-3 border-t border-black/8 text-xs">
                    <p className="font-semibold text-[#121212]">Youssef El Amrani</p>
                    <p className="text-[#5A5955]">
                      Verified FRESH_MEN.1 Member · Casablanca, Morocco
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Clean Editorial Footer with Official Brand Logo */}
      <footer className="border-t border-black/10 bg-[#121212] text-[#D4D3CD] py-10 px-4 sm:px-6 lg:px-10">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-4">
            <img
              src={BRAND_LOGO_IMAGE}
              alt="FRESH_MEN.1 Crown Logo"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full border border-[#D4AF37] object-cover"
            />
            <div>
              <p className="font-display font-bold text-white text-base tracking-wide">
                FRESH_<span className="text-[#D4AF37]">MEN.1</span>
              </p>
              <p className="text-[#9E9D96] mt-0.5">
                © 2026 FRESH_MEN.1 · Style For Every Man · Casual / Sport / Classic / Accessories.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => navigateCategory('Apparel')}
              className="hover:text-[#D4AF37] transition-colors"
            >
              Polos & Packs
            </button>
            <button
              type="button"
              onClick={() => navigateCategory('Sneakers')}
              className="hover:text-[#D4AF37] transition-colors"
            >
              Sneakers
            </button>
            <button
              type="button"
              onClick={() => setActiveView('tracking')}
              className="hover:text-[#D4AF37] transition-colors"
            >
              Live Order Tracking
            </button>
            <button
              type="button"
              onClick={() => setActiveView('account')}
              className="hover:text-[#D4AF37] transition-colors"
            >
              Member Profile
            </button>
          </div>
        </div>
      </footer>

      {/* Product Detail Contiguous Purchase Modal with Interactive 3D Piece Inspection */}
      <ProductDetailModal
        product={selectedProduct}
        preferredShoeSize={userPrivateInfo?.preferredSizeShoe}
        preferredApparelSize={userPrivateInfo?.preferredSizeApparel}
        onClose={() => setSelectedProduct(null)}
        onAddToBag={handleAddToBag}
      />

      {/* Slide-Over Shopping Bag & Integrated Checkout Drawer */}
      <CheckoutDrawer
        isOpen={isCheckoutOpen}
        cart={cart}
        user={user}
        userProfile={userProfile}
        userPrivateInfo={userPrivateInfo}
        onClose={() => setIsCheckoutOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
        onSignIn={handleSignIn}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}
