import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Lock,
  CreditCard,
  Truck,
  CheckCircle2,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import { CartItem, UserPrivateInfoRecord, UserProfileRecord } from '../types';
import { ResilientImage } from './ResilientImage';
import { createOrderWithItemsAndEvent } from '../services/storeService';

interface CheckoutDrawerProps {
  isOpen: boolean;
  cart: CartItem[];
  user: User | null;
  userProfile: UserProfileRecord | null;
  userPrivateInfo: UserPrivateInfoRecord | null;
  onClose: () => void;
  onUpdateQuantity: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onSignIn: () => Promise<void>;
  onOrderCreated: (orderId: string) => void;
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  cart,
  user,
  userProfile,
  userPrivateInfo,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSignIn,
  onOrderCreated,
}) => {
  const [step, setStep] = useState<'bag' | 'checkout' | 'processing'>('bag');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [shippingCountry, setShippingCountry] = useState('Morocco');

  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'Express Pay' | 'Cash on Delivery'>('Card');
  const [useSavedCard, setUseSavedCard] = useState(true);
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 4829');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('842');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.displayName) {
      setCustomerName(userProfile.displayName);
    } else if (user?.displayName) {
      setCustomerName(user.displayName);
    }
    if (userPrivateInfo) {
      setPhone(userPrivateInfo.phone || '+212 6 61 24 80 00');
      setShippingAddress(userPrivateInfo.shippingAddress || 'Boulevard d’Anfa 42, Maarif');
      setShippingCity(userPrivateInfo.shippingCity || 'Casablanca');
      setShippingPostalCode(userPrivateInfo.shippingPostalCode || '20100');
      setShippingCountry(userPrivateInfo.shippingCountry || 'Morocco');
      if (userPrivateInfo.savedCardLast4) {
        setUseSavedCard(true);
      }
    }
  }, [user, userProfile, userPrivateInfo]);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const freeShippingThreshold = 4000;
  const shippingFee = subtotal === 0 ? 0 : subtotal >= freeShippingThreshold ? 0 : 150;
  const totalAmount = subtotal + shippingFee;

  const formatCardInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!user) {
      setErrorMsg('Please sign in with Google to bind live shipment tracking to your account.');
      return;
    }

    if (customerName.trim().length < 2) {
      setErrorMsg('Please enter the recipient full name.');
      return;
    }
    if (shippingAddress.trim().length < 5) {
      setErrorMsg('Please enter a valid street address (minimum 5 characters).');
      return;
    }
    if (shippingCity.trim().length < 2 || shippingPostalCode.trim().length < 2) {
      setErrorMsg('Please enter a valid destination city and postal code.');
      return;
    }

    let resolvedLast4 = '';
    if (paymentMethod === 'Card') {
      if (useSavedCard && userPrivateInfo?.savedCardLast4) {
        resolvedLast4 = userPrivateInfo.savedCardLast4;
      } else {
        const rawDigits = cardNumber.replace(/\D/g, '');
        if (rawDigits.length < 4) {
          setErrorMsg('Please enter a valid card number.');
          return;
        }
        resolvedLast4 = rawDigits.slice(-4);
      }
    } else if (paymentMethod === 'Express Pay') {
      resolvedLast4 = userPrivateInfo?.savedCardLast4 || '9012';
    }

    setStep('processing');
    try {
      const orderId = await createOrderWithItemsAndEvent({
        user,
        cart,
        customerName,
        shippingAddress,
        shippingCity,
        shippingPostalCode,
        shippingCountry,
        paymentMethod,
        paymentLast4: resolvedLast4,
      });
      onClearCart();
      setStep('bag');
      onOrderCreated(orderId);
    } catch (err) {
      setStep('checkout');
      setErrorMsg(
        err instanceof Error
          ? 'Could not process order. Verify your shipping fields and try again.'
          : 'Checkout failed.'
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="checkout-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Bag and Checkout"
        >
          <motion.div
            key="checkout-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#FBFBF9] h-full flex flex-col border-l border-black/10 justify-between overflow-hidden shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-black/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-[#121212]">
                  {step === 'bag'
                    ? 'fresh_men.1 Shopping Bag'
                    : step === 'checkout'
                    ? 'fresh_men.1 Checkout & Dispatch'
                    : 'Authorizing Order'}
                </h2>
                <p className="text-xs text-[#6E6D68]">
                  {cart.reduce((s, i) => s + i.quantity, 0)} Pieces <span aria-hidden="true">·</span>{' '}
                  {subtotal >= freeShippingThreshold
                    ? 'Complimentary Priority Air Shipping Unlocked'
                    : `${(freeShippingThreshold - subtotal).toLocaleString()} MAD away from complimentary shipping`}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-lg border border-black/10 flex items-center justify-center text-[#121212] hover:bg-[#121212] hover:text-[#FBFBF9] transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16">
                  <p className="text-base font-semibold text-[#121212] mb-1">
                    Your fresh_men.1 Bag is Empty
                  </p>
                  <p className="text-xs text-[#6E6D68] max-w-xs mb-6">
                    Explore the footwear and technical outerwear collection to add pieces.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-5 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold hover:bg-[#2A2A28] transition-colors"
                  >
                    Explore Collection
                  </button>
                </div>
              ) : step === 'bag' ? (
                <div className="space-y-5">
                  {cart.map((item, idx) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={`${item.product.id}-${item.size}-${item.colorway}`}
                      className="flex gap-4 pb-5 border-b border-black/8"
                    >
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#F2F1ED] shrink-0">
                        <ResilientImage
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          category={item.product.category}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#121212] truncate">
                            {item.product.title}
                          </h3>
                          <span className="text-sm font-mono font-semibold tabular-nums text-[#121212] shrink-0">
                            {(item.product.price * item.quantity).toLocaleString()} MAD
                          </span>
                        </div>
                        <p className="text-xs text-[#6E6D68] mt-0.5">
                          {item.size} <span aria-hidden="true">·</span> {item.colorway}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="inline-flex items-center border border-black/15 rounded-md bg-white">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(idx, -1)}
                              className="px-2.5 py-1 text-xs font-mono hover:bg-black/5"
                              aria-label="Decrease item quantity"
                            >
                              -
                            </button>
                            <span className="px-2.5 text-xs font-mono tabular-nums font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(idx, 1)}
                              className="px-2.5 py-1 text-xs font-mono hover:bg-black/5"
                              aria-label="Increase item quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(idx)}
                            className="text-xs text-[#6E6D68] hover:text-red-700 inline-flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  <div className="p-4 rounded-lg bg-[#F3F2EE] border border-black/8 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-[#121212]">
                      <Truck className="w-4 h-4" />
                      <span>fresh_men.1 Live Telemetry Waybill Assigned at Checkout</span>
                    </div>
                    <p className="text-[#5A5955] leading-relaxed">
                      Every order receives a dedicated DHL Express Priority Air waybill with real-time 6-stage telemetry from our Zurich facility to your door.
                    </p>
                  </div>
                </div>
              ) : step === 'checkout' ? (
                <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-6">
                  {!user && (
                    <div className="p-4 rounded-lg bg-[#121212] text-[#FBFBF9] space-y-3">
                      <p className="text-xs font-semibold">
                        Member Authentication Required for Real-Time Shipment Tracking
                      </p>
                      <p className="text-xs text-[#D4D3CD]">
                        Sign in with Google to bind your fresh_men.1 order waybill to your profile and track live carrier telemetry.
                      </p>
                      <button
                        type="button"
                        onClick={onSignIn}
                        className="w-full py-2.5 px-4 rounded-lg bg-[#FBFBF9] text-[#121212] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#EAE8E1] transition-colors"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Sign In with Google to Continue</span>
                      </button>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                      {errorMsg}
                    </div>
                  )}

                  {/* Shipping Destination */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-[#121212]">
                        01. Shipping Destination & Recipient
                      </h3>
                      {userPrivateInfo && (
                        <span className="text-xs text-[#6E6D68]">Synced from Profile Vault</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#5A5955] mb-1">Recipient Full Name</label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Alex Mercer"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-black/15 bg-white focus:outline-none focus:border-[#121212]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#5A5955] mb-1">Courier SMS Phone</label>
                        <input
                          type="tel"
                          required
                          maxLength={40}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+41 44 580 24 00"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-black/15 bg-white font-mono focus:outline-none focus:border-[#121212]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#5A5955] mb-1">Street Address & Suite</label>
                      <input
                        type="text"
                        required
                        minLength={5}
                        maxLength={240}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Bahnhofstrasse 42, Suite 3B"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-black/15 bg-white focus:outline-none focus:border-[#121212]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-[#5A5955] mb-1">City</label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={80}
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          placeholder="Zurich"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-black/15 bg-white focus:outline-none focus:border-[#121212]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#5A5955] mb-1">Postal Code</label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={24}
                          value={shippingPostalCode}
                          onChange={(e) => setShippingPostalCode(e.target.value)}
                          placeholder="8001"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-black/15 bg-white font-mono focus:outline-none focus:border-[#121212]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#5A5955] mb-1">Country</label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={60}
                          value={shippingCountry}
                          onChange={(e) => setShippingCountry(e.target.value)}
                          placeholder="Switzerland"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-black/15 bg-white focus:outline-none focus:border-[#121212]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Processing Method */}
                  <div className="space-y-3 pt-3 border-t border-black/10">
                    <h3 className="text-xs font-semibold text-[#121212]">
                      02. Integrated Payment Method
                    </h3>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-[#F2F1ED] rounded-lg">
                      {(['Card', 'Express Pay', 'Cash on Delivery'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                            paymentMethod === method
                              ? 'bg-white text-[#121212] font-semibold shadow-2xs'
                              : 'text-[#5A5955] hover:text-[#121212]'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === 'Card' && (
                      <div className="p-4 rounded-lg bg-white border border-black/12 space-y-3">
                        {userPrivateInfo?.savedCardLast4 && (
                          <label className="flex items-center gap-2 text-xs font-medium text-[#121212] cursor-pointer pb-2 border-b border-black/8">
                            <input
                              type="checkbox"
                              checked={useSavedCard}
                              onChange={(e) => setUseSavedCard(e.target.checked)}
                              className="rounded border-black/30"
                            />
                            <span>
                              Use saved {userPrivateInfo.savedCardBrand || 'Card'} ending in{' '}
                              <span className="font-mono font-semibold">{userPrivateInfo.savedCardLast4}</span>
                            </span>
                          </label>
                        )}

                        {(!useSavedCard || !userPrivateInfo?.savedCardLast4) && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs text-[#5A5955] mb-1">Card Number</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  required
                                  value={cardNumber}
                                  onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                                  placeholder="4532 0192 8492 4829"
                                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                                />
                                <CreditCard className="w-4 h-4 text-[#6E6D68] absolute right-3 top-2.5" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-[#5A5955] mb-1">Expiry (MM/YY)</label>
                                <input
                                  type="text"
                                  required
                                  maxLength={5}
                                  value={cardExpiry}
                                  onChange={(e) => setCardExpiry(e.target.value)}
                                  placeholder="08/29"
                                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-[#5A5955] mb-1">Security Code (CVC)</label>
                                <input
                                  type="text"
                                  required
                                  maxLength={4}
                                  value={cardCvc}
                                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                                  placeholder="842"
                                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-black/15 bg-[#FBFBF9]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-[#6E6D68]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>256-Bit TLS Encrypted Settlement · Instant Waybill Allocation</span>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'Express Pay' && (
                      <div className="p-4 rounded-lg bg-white border border-black/12 space-y-2 text-xs">
                        <p className="font-semibold text-[#121212]">
                          fresh_men.1 Express Tokenized Settlement
                        </p>
                        <p className="text-[#5A5955]">
                          Your authenticated Google identity and default member vault credentials will settle{' '}
                          <span className="font-mono font-semibold text-[#121212]">
                            {totalAmount.toLocaleString()} MAD
                          </span>{' '}
                          immediately with zero additional card entry.
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'Cash on Delivery' && (
                      <div className="p-4 rounded-lg bg-white border border-black/12 space-y-2 text-xs">
                        <p className="font-semibold text-[#121212]">
                          Cash on Delivery (COD) Verification
                        </p>
                        <p className="text-[#5A5955]">
                          Payable upon courier signature inspection at{' '}
                          <span className="font-semibold text-[#121212]">
                            {shippingAddress || 'your delivery address'}, {shippingCity || 'City'} (
                            {shippingPostalCode || 'Postal'})
                          </span>
                          .
                        </p>
                        <div className="pt-1 flex items-center justify-between font-mono text-[#121212] border-t border-black/8">
                          <span>Amount Due on Delivery:</span>
                          <span className="font-semibold">{totalAmount.toLocaleString()} MAD</span>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#121212] animate-pulse" />
                  <p className="text-base font-semibold text-[#121212]">
                    Serializing Waybill & Allocating Inventory...
                  </p>
                  <p className="text-xs text-[#6E6D68] max-w-xs">
                    Registering real-time DHL Express Priority Air telemetry for your fresh_men.1 order.
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            {cart.length > 0 && step !== 'processing' && (
              <div className="p-6 border-t border-black/10 bg-[#F3F2EE] space-y-4">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#5A5955]">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{subtotal.toLocaleString()} MAD</span>
                  </div>
                  <div className="flex justify-between text-[#5A5955]">
                    <span>DHL Priority Air Shipping (Free over 4,000 MAD)</span>
                    <span className="font-mono tabular-nums">
                      {shippingFee === 0 ? 'Complimentary' : `${shippingFee} MAD`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-[#121212] pt-2 border-t border-black/10">
                    <span>Total</span>
                    <span className="font-mono tabular-nums">{totalAmount.toLocaleString()} MAD</span>
                  </div>
                </div>

                {step === 'bag' ? (
                  <button
                    type="button"
                    onClick={() => setStep('checkout')}
                    className="w-full py-3 px-5 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold hover:bg-[#2A2A28] transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('bag')}
                      className="py-3 px-4 rounded-lg border border-black/20 text-xs font-semibold text-[#121212] hover:bg-black/5 transition-colors whitespace-nowrap"
                    >
                      Back to Bag
                    </button>
                    <button
                      type="submit"
                      form="checkout-form"
                      disabled={!user}
                      className="flex-1 py-3 px-5 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold hover:bg-[#2A2A28] disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      Authorize {totalAmount.toLocaleString()} MAD & Track Live
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
