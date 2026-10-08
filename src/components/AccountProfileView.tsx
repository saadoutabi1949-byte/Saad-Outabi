import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Shield,
  LogOut,
  Check,
  ArrowLeft,
  LogIn,
  Package,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  OrderRecord,
  UserPrivateInfoRecord,
  UserProfileRecord,
} from '../types';
import { saveUserAccountSettings } from '../services/storeService';

interface AccountProfileViewProps {
  user: User | null;
  userProfile: UserProfileRecord | null;
  userPrivateInfo: UserPrivateInfoRecord | null;
  orders: OrderRecord[];
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onRefreshProfile: () => Promise<void>;
  onNavigateToOrder: (orderId: string) => void;
  onBackToStore: () => void;
}

export const AccountProfileView: React.FC<AccountProfileViewProps> = ({
  user,
  userProfile,
  userPrivateInfo,
  orders,
  onSignIn,
  onSignOut,
  onRefreshProfile,
  onNavigateToOrder,
  onBackToStore,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [membershipTier, setMembershipTier] = useState<
    'Standard' | 'Atelier Member' | 'Archive Collector'
  >('Atelier Member');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('');
  const [preferredSizeShoe, setPreferredSizeShoe] = useState('EU 42');
  const [preferredSizeApparel, setPreferredSizeApparel] = useState('L');
  const [savedCardBrand, setSavedCardBrand] = useState('Visa Infinite');
  const [savedCardLast4, setSavedCardLast4] = useState('4829');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setMembershipTier(userProfile.membershipTier || 'Atelier Member');
    }
    if (userPrivateInfo) {
      setEmail(userPrivateInfo.email || user?.email || '');
      setPhone(userPrivateInfo.phone || '');
      setShippingAddress(userPrivateInfo.shippingAddress || '');
      setShippingCity(userPrivateInfo.shippingCity || '');
      setShippingPostalCode(userPrivateInfo.shippingPostalCode || '');
      setShippingCountry(userPrivateInfo.shippingCountry || '');
      setPreferredSizeShoe(userPrivateInfo.preferredSizeShoe || 'EU 42');
      setPreferredSizeApparel(userPrivateInfo.preferredSizeApparel || 'L');
      setSavedCardBrand(userPrivateInfo.savedCardBrand || 'Visa Infinite');
      setSavedCardLast4(userPrivateInfo.savedCardLast4 || '4829');
    }
  }, [userProfile, userPrivateInfo, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      await saveUserAccountSettings(
        user.uid,
        {
          displayName,
          photoURL: userProfile?.photoURL || user.photoURL || '',
          membershipTier,
        },
        {
          email,
          phone,
          shippingAddress,
          shippingCity,
          shippingPostalCode,
          shippingCountry,
          preferredSizeShoe,
          preferredSizeApparel,
          savedCardBrand,
          savedCardLast4,
        }
      );
      await onRefreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? 'Failed to save profile settings.' : 'Update error.'
      );
    } finally {
      setSaving(false);
    }
  };

  const activeShipmentsCount = orders.filter((o) => o.shipmentStatus !== 'Delivered').length;
  const lifetimeSpend = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-black/10">
        <div>
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 text-xs text-[#6E6D68] hover:text-[#121212] mb-3 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Collection</span>
          </button>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-[#121212]">
            fresh_men.1 Member Profile & Vault
          </h1>
          <p className="text-sm text-[#5A5955] mt-1">
            Manage sizing defaults, encrypted shipping coordinates, and payment credentials.
          </p>
        </div>

        {user && (
          <button
            type="button"
            onClick={onSignOut}
            className="py-2 px-4 rounded-lg border border-black/15 text-xs font-semibold text-[#121212] hover:bg-black/5 inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {!user ? (
        <div className="my-12 p-8 md:p-12 rounded-xl bg-[#F3F2EE] border border-black/10 max-w-xl mx-auto text-center space-y-4">
          <UserIcon className="w-8 h-8 text-[#121212] mx-auto stroke-[1.5]" />
          <h2 className="text-xl font-bold text-[#121212]">
            Sign In to Your fresh_men.1 Profile
          </h2>
          <p className="text-sm text-[#5A5955] leading-relaxed">
            Store your preferred footwear and apparel sizing, default shipping coordinates, and payment preferences for instant 1-click checkout and real-time order tracking.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="py-3 px-6 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#2A2A28] transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
          {/* Left Column: Member Overview & Recent Orders */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-xl bg-white border border-black/10 space-y-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#121212] text-[#FBFBF9] flex items-center justify-center font-bold text-base shrink-0">
                  {(displayName || user.email || 'V')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#121212] truncate">
                    {displayName || 'Atelier Member'}
                  </h2>
                  <p className="text-xs text-[#6E6D68] truncate">
                    {membershipTier} <span aria-hidden="true">·</span> Verified Account
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-black/8 text-center">
                <div>
                  <p className="text-xs text-[#6E6D68]">Orders</p>
                  <p className="text-base font-mono font-semibold tabular-nums text-[#121212]">
                    {orders.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6E6D68]">In Transit</p>
                  <p className="text-base font-mono font-semibold tabular-nums text-[#121212]">
                    {activeShipmentsCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6E6D68]">Total Spend</p>
                  <p className="text-base font-mono font-semibold tabular-nums text-[#121212]">
                    {lifetimeSpend.toLocaleString()} MAD
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-black/8 flex items-start gap-2 text-xs text-[#5A5955]">
                <Shield className="w-4 h-4 text-[#121212] shrink-0 mt-0.5" />
                <span>
                  Split-Collection PII Isolation active. Your shipping address and contact details are stored in an owner-isolated private vault.
                </span>
              </div>
            </div>

            {/* Quick Order History Links */}
            <div className="p-6 rounded-xl bg-white border border-black/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#121212]">
                  Recent Platform Orders
                </h3>
                <Package className="w-4 h-4 text-[#6E6D68]" />
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-[#6E6D68]">No orders placed yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.slice(0, 4).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onNavigateToOrder(o.id)}
                      className="w-full text-left p-3 rounded-lg bg-[#FBFBF9] border border-black/8 hover:border-black/30 transition-colors text-xs"
                    >
                      <div className="flex justify-between font-mono font-semibold text-[#121212]">
                        <span>{o.orderNumber}</span>
                        <span>{o.totalAmount.toLocaleString()} MAD</span>
                      </div>
                      <p className="text-[#5A5955] truncate mt-0.5">
                        {o.shipmentStatus} · {o.progressPercent}%
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Profile & Isolated Private Vault Form */}
          <div className="lg:col-span-8">
            <form
              onSubmit={handleSave}
              className="p-6 md:p-8 rounded-xl bg-white border border-black/10 space-y-6"
            >
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {errorMessage}
                </div>
              )}

              {/* Section 1: Public Member Identity & Sizing */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#121212] border-b border-black/8 pb-2">
                  01. Member Identity & Sizing Architecture
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Display Name</label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-black/15 bg-[#FBFBF9] focus:outline-none focus:border-[#121212]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Membership Tier</label>
                    <select
                      value={membershipTier}
                      onChange={(e) =>
                        setMembershipTier(
                          e.target.value as 'Standard' | 'Atelier Member' | 'Archive Collector'
                        )
                      }
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-black/15 bg-[#FBFBF9] focus:outline-none focus:border-[#121212]"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Atelier Member">Atelier Member</option>
                      <option value="Archive Collector">Archive Collector</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">
                      Default Sneaker Size (Pre-selected in Store)
                    </label>
                    <select
                      value={preferredSizeShoe}
                      onChange={(e) => setPreferredSizeShoe(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                    >
                      {['EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">
                      Default Apparel Size (Pre-selected in Store)
                    </label>
                    <select
                      value={preferredSizeApparel}
                      onChange={(e) => setPreferredSizeApparel(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                    >
                      {['S', 'M', 'L', 'XL'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Isolated Private Shipping Vault */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-[#121212] border-b border-black/8 pb-2">
                  02. Encrypted Delivery Coordinates & Contact
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Notification Email</label>
                    <input
                      type="email"
                      required
                      maxLength={160}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-black/15 bg-[#FBFBF9]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Courier SMS Phone</label>
                    <input
                      type="tel"
                      maxLength={40}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#5A5955] mb-1">Default Street Address</label>
                  <input
                    type="text"
                    maxLength={200}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-black/15 bg-[#FBFBF9]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">City</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-black/15 bg-[#FBFBF9]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Postal Code</label>
                    <input
                      type="text"
                      maxLength={24}
                      value={shippingPostalCode}
                      onChange={(e) => setShippingPostalCode(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Country</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={shippingCountry}
                      onChange={(e) => setShippingCountry(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-black/15 bg-[#FBFBF9]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Saved Payment Instrument */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-[#121212] border-b border-black/8 pb-2">
                  03. Saved Payment Instrument for 1-Click Checkout
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Card Network / Tier</label>
                    <select
                      value={savedCardBrand}
                      onChange={(e) => setSavedCardBrand(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-black/15 bg-[#FBFBF9]"
                    >
                      <option value="Visa Infinite">Visa Infinite</option>
                      <option value="Mastercard World Elite">Mastercard World Elite</option>
                      <option value="Amex Platinum">Amex Platinum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#5A5955] mb-1">Last 4 Digits</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={savedCardLast4}
                      onChange={(e) => setSavedCardLast4(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-black/10">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-3 px-6 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold hover:bg-[#2A2A28] transition-colors inline-flex items-center gap-2"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Profile & Vault Saved</span>
                    </>
                  ) : (
                    <span>{saving ? 'Syncing to Vault...' : 'Save Profile & Vault Preferences'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
