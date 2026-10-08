import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Play,
  Pause,
  FastForward,
  Search,
  Edit3,
  Package,
  ArrowLeft,
  LogIn,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  OrderItemRecord,
  OrderRecord,
  ShipmentEventRecord,
  UserPrivateInfoRecord,
  UserProfileRecord,
} from '../types';
import { CATALOG_PRODUCTS, SHIPMENT_STAGES } from '../data/catalog';
import {
  advanceOrderShipmentStage,
  createOrderWithItemsAndEvent,
  updateOrderShippingAddressBeforeDispatch,
} from '../services/storeService';
import { ResilientImage } from './ResilientImage';

interface OrderTrackingCenterProps {
  user: User | null;
  userProfile: UserProfileRecord | null;
  userPrivateInfo: UserPrivateInfoRecord | null;
  orders: OrderRecord[];
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  onSignIn: () => Promise<void>;
  onBackToStore: () => void;
}

export const OrderTrackingCenter: React.FC<OrderTrackingCenterProps> = ({
  user,
  userProfile,
  userPrivateInfo,
  orders,
  selectedOrderId,
  onSelectOrder,
  onSignIn,
  onBackToStore,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemRecord[]>([]);
  const [shipmentEvents, setShipmentEvents] = useState<ShipmentEventRecord[]>([]);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);

  // Pre-dispatch address edit state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPostal, setEditPostal] = useState('');
  const [addressUpdateLoading, setAddressUpdateLoading] = useState(false);

  const filteredOrders = orders.filter((ord) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.trackingNumber.toLowerCase().includes(q) ||
      ord.shippingCity.toLowerCase().includes(q) ||
      ord.primaryItemTitle.toLowerCase().includes(q) ||
      ord.shipmentStatus.toLowerCase().includes(q)
    );
  });

  const activeOrder =
    orders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || orders[0] || null;

  // Sync address editor fields when activeOrder changes
  useEffect(() => {
    if (activeOrder) {
      setEditAddress(activeOrder.shippingAddressSummary);
      setEditCity(activeOrder.shippingCity);
      setEditPostal(activeOrder.shippingPostalCode);
      setIsEditingAddress(false);
      if (activeOrder.shipmentStatus === 'Delivered') {
        setAutoSimulate(false);
      }
    }
  }, [activeOrder?.id, activeOrder?.shipmentStatus]);

  // Real-time Firestore listeners for active order's items and carrier scan events
  useEffect(() => {
    if (!user || !activeOrder) {
      setOrderItems([]);
      setShipmentEvents([]);
      return;
    }

    const itemsPath = `orders/${activeOrder.id}/items`;
    const itemsQ = query(
      collection(db, 'orders', activeOrder.id, 'items'),
      where('userId', '==', user.uid),
      where('orderId', '==', activeOrder.id)
    );

    const unsubItems = onSnapshot(
      itemsQ,
      (snap) => {
        const loaded: OrderItemRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<OrderItemRecord, 'id'>),
        }));
        setOrderItems(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, itemsPath);
      }
    );

    const eventsPath = `orders/${activeOrder.id}/events`;
    const eventsQ = query(
      collection(db, 'orders', activeOrder.id, 'events'),
      where('userId', '==', user.uid),
      where('orderId', '==', activeOrder.id)
    );

    const unsubEvents = onSnapshot(
      eventsQ,
      (snap) => {
        const loaded: ShipmentEventRecord[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ShipmentEventRecord, 'id'>),
          }))
          .sort((a, b) => b.stepIndex - a.stepIndex);
        setShipmentEvents(loaded);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, eventsPath);
      }
    );

    return () => {
      unsubItems();
      unsubEvents();
    };
  }, [user, activeOrder?.id]);

  // Optional live auto-simulation timer that writes real Firestore updates
  useEffect(() => {
    if (!autoSimulate || !activeOrder || activeOrder.shipmentStatus === 'Delivered') {
      return;
    }

    const timer = setInterval(async () => {
      try {
        setIsAdvancing(true);
        await advanceOrderShipmentStage(activeOrder);
      } finally {
        setIsAdvancing(false);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [autoSimulate, activeOrder]);

  const handleManualAdvance = async () => {
    if (!activeOrder || activeOrder.shipmentStatus === 'Delivered' || isAdvancing) return;
    setIsAdvancing(true);
    try {
      await advanceOrderShipmentStage(activeOrder);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleCreateSampleOrder = async () => {
    if (!user || isCreatingDemo) return;
    setIsCreatingDemo(true);
    try {
      const newOrderId = await createOrderWithItemsAndEvent({
        user,
        cart: [
          {
            product: CATALOG_PRODUCTS[0],
            size: userPrivateInfo?.preferredSizeShoe || 'EU 42',
            colorway: CATALOG_PRODUCTS[0].colorways[0],
            quantity: 1,
          },
        ],
        customerName: userProfile?.displayName || user.displayName || 'Atelier Member',
        shippingAddress: userPrivateInfo?.shippingAddress || 'Bahnhofstrasse 42, Suite 3B',
        shippingCity: userPrivateInfo?.shippingCity || 'Zurich',
        shippingPostalCode: userPrivateInfo?.shippingPostalCode || '8001',
        shippingCountry: userPrivateInfo?.shippingCountry || 'Switzerland',
        paymentMethod: 'Card',
        paymentLast4: userPrivateInfo?.savedCardLast4 || '4829',
      });
      onSelectOrder(newOrderId);
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const handleSaveAddressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setAddressUpdateLoading(true);
    try {
      await updateOrderShippingAddressBeforeDispatch(
        activeOrder,
        editAddress,
        editCity,
        editPostal
      );
      setIsEditingAddress(false);
    } finally {
      setAddressUpdateLoading(false);
    }
  };

  const currentStageIndex = activeOrder
    ? SHIPMENT_STAGES.findIndex((s) => s.stage === activeOrder.shipmentStatus)
    : 0;

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-black/10">
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
            Real-Time Order & Shipment Telemetry
          </h1>
          <p className="text-sm text-[#5A5955] mt-1">
            Live carrier synchronization for every order placed through fresh_men.1.
          </p>
        </div>

        {user && orders.length > 0 && (
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#6E6D68] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by waybill, order ID, city..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-black/15 bg-white focus:outline-none focus:border-[#121212]"
            />
          </div>
        )}
      </div>

      {/* Unauthenticated State */}
      {!user ? (
        <div className="my-12 p-8 md:p-12 rounded-xl bg-[#F3F2EE] border border-black/10 max-w-xl mx-auto text-center space-y-4">
          <Truck className="w-8 h-8 text-[#121212] mx-auto stroke-[1.5]" />
          <h2 className="text-xl font-bold text-[#121212]">
            Authenticate to Access Live Order Telemetry
          </h2>
          <p className="text-sm text-[#5A5955] leading-relaxed">
            For security and PII isolation, live DHL Express Priority Air waybills and delivery coordinates are encrypted and bound to your verified Google account.
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
      ) : orders.length === 0 ? (
        /* Empty Orders State with 1-Click Live Order Generator */
        <div className="my-12 p-8 md:p-12 rounded-xl bg-[#F3F2EE] border border-black/10 max-w-2xl mx-auto text-center space-y-5">
          <Package className="w-8 h-8 text-[#121212] mx-auto stroke-[1.5]" />
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-[#121212]">No Active Shipments Found</h2>
            <p className="text-sm text-[#5A5955] max-w-md mx-auto">
              Every order completed in the storefront automatically appears here with a live 6-stage carrier tracking pipeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBackToStore}
              className="py-2.5 px-5 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold hover:bg-[#2A2A28] transition-colors"
            >
              Shop Sneakers & Apparel
            </button>
            <button
              type="button"
              disabled={isCreatingDemo}
              onClick={handleCreateSampleOrder}
              className="py-2.5 px-5 rounded-lg border border-[#121212] text-[#121212] text-xs font-semibold hover:bg-[#121212] hover:text-[#FBFBF9] transition-colors disabled:opacity-50"
            >
              {isCreatingDemo
                ? 'Provisioning Live Waybill...'
                : 'Create Instant Test Order (Arcus-800 Runner)'}
            </button>
          </div>
        </div>
      ) : (
        /* Split Layout: Order List Sidebar + Real-Time Shipment Console */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
          {/* Left Column: All Platform Orders */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-[#6E6D68] pb-1">
              <span>Your Platform Orders ({filteredOrders.length})</span>
              <span className="font-mono">Live Sync Active</span>
            </div>

            <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
              {filteredOrders.map((ord) => {
                const isSelected = activeOrder?.id === ord.id;
                return (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => onSelectOrder(ord.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      isSelected
                        ? 'bg-[#121212] text-[#FBFBF9] border-[#121212]'
                        : 'bg-white text-[#121212] border-black/10 hover:border-black/30'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold tabular-nums">
                        {ord.orderNumber}
                      </span>
                      <span className="font-mono text-xs tabular-nums">
                        {ord.totalAmount.toLocaleString()} MAD
                      </span>
                    </div>

                    <p
                      className={`text-sm font-semibold truncate mb-2 ${
                        isSelected ? 'text-[#FBFBF9]' : 'text-[#121212]'
                      }`}
                    >
                      {ord.primaryItemTitle}
                      {ord.itemCount > 1 ? ` + ${ord.itemCount - 1} more` : ''}
                    </p>

                    {/* Clean Unboxed Metadata per Zero-Pill Rule */}
                    <div
                      className={`flex flex-wrap items-center gap-1.5 text-xs ${
                        isSelected ? 'text-[#D4D3CD]' : 'text-[#6E6D68]'
                      }`}
                    >
                      <span className="font-medium">{ord.shipmentStatus}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ord.progressPercent}%</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{ord.shippingCity}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Order Live Shipment Telemetry */}
          {activeOrder && (
            <div className="lg:col-span-8 space-y-8">
              {/* Primary Telemetry Panel */}
              <div className="p-6 md:p-8 rounded-xl bg-white border border-black/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-black/8">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6D68] font-mono">
                      <span>Order {activeOrder.orderNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>Waybill {activeOrder.trackingNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeOrder.paymentStatus}</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-[#121212]">
                      {activeOrder.shipmentStatus}
                    </h2>
                    <p className="text-xs text-[#4A4945]">{activeOrder.lastStatusNote}</p>
                  </div>

                  {/* Interactive Real-Time Carrier Simulation Controls */}
                  {activeOrder.shipmentStatus !== 'Delivered' ? (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isAdvancing}
                        onClick={handleManualAdvance}
                        className="py-2 px-3.5 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#2A2A28] disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        <FastForward className="w-3.5 h-3.5" />
                        <span>
                          {isAdvancing ? 'Scanning...' : 'Simulate Next Carrier Scan'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoSimulate(!autoSimulate)}
                        className={`py-2 px-3.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                          autoSimulate
                            ? 'border-[#121212] bg-[#F3F2EE] text-[#121212]'
                            : 'border-black/20 text-[#121212] hover:bg-black/5'
                        }`}
                      >
                        {autoSimulate ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause Auto-Stream</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Auto-Stream Transit</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completed & Signed at Destination</span>
                    </div>
                  )}
                </div>

                {/* Live Route & Progress Bar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5A5955]">
                      Current Facility:{' '}
                      <strong className="text-[#121212]">{activeOrder.currentHub}</strong>
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#121212]">
                      {activeOrder.progressPercent}% Complete
                    </span>
                  </div>

                  <div className="w-full h-2 bg-[#ECEAE4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#121212] transition-all duration-300"
                      style={{ width: `${activeOrder.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#6E6D68] pt-1">
                    <span>Origin: Zurich Atelier Vault</span>
                    <span>Est. Delivery: {activeOrder.estimatedDelivery}</span>
                    <span>Destination: {activeOrder.destinationHub}</span>
                  </div>
                </div>

                {/* 6-Stage Shipment Architecture Pipeline */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
                  {SHIPMENT_STAGES.map((stageObj, index) => {
                    const isCompleted = index <= currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    return (
                      <div
                        key={stageObj.stage}
                        className={`p-3 rounded-lg border transition-colors ${
                          isCurrent
                            ? 'border-[#121212] bg-[#F3F2EE]'
                            : isCompleted
                            ? 'border-black/15 bg-white'
                            : 'border-black/6 bg-[#FBFBF9] opacity-55'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-semibold tabular-nums text-[#6E6D68]">
                            0{index + 1}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#121212]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-[#8C8B85]" />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#121212] leading-snug">
                          {stageObj.stage}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two-Column Details: Live Carrier Scan History & Delivery Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Real-Time Scan Checkpoints */}
                <div className="p-6 rounded-xl bg-white border border-black/10 space-y-4">
                  <div className="flex items-center justify-between border-b border-black/8 pb-3">
                    <h3 className="text-sm font-bold text-[#121212]">
                      Carrier Checkpoint Log
                    </h3>
                    <span className="text-xs font-mono text-[#6E6D68]">
                      {activeOrder.carrier}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {shipmentEvents.map((evt, i) => (
                      <div key={evt.id} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-2.5 h-2.5 rounded-full mt-1 ${
                              i === 0 ? 'bg-[#121212]' : 'bg-black/25'
                            }`}
                          />
                          {i < shipmentEvents.length - 1 && (
                            <div className="w-px flex-1 bg-black/12 my-1" />
                          )}
                        </div>
                        <div className="pb-2">
                          <div className="flex items-center gap-2 text-[#6E6D68] font-mono">
                            <span>{evt.timestampLabel}</span>
                            <span aria-hidden="true">·</span>
                            <span>Stage 0{evt.stepIndex + 1}</span>
                          </div>
                          <p className="font-semibold text-[#121212] mt-0.5">
                            {evt.statusStage} — {evt.location}
                          </p>
                          <p className="text-[#5A5955] mt-0.5 leading-relaxed">
                            {evt.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Coordinates & Pre-Dispatch Address Editor + Order Items */}
                <div className="space-y-6">
                  <div className="p-6 rounded-xl bg-white border border-black/10 space-y-4">
                    <div className="flex items-center justify-between border-b border-black/8 pb-3">
                      <h3 className="text-sm font-bold text-[#121212]">
                        Delivery Coordinates & Settlement
                      </h3>
                      {activeOrder.shipmentStatus === 'Order Confirmed' && (
                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(!isEditingAddress)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#121212] underline underline-offset-4"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditingAddress ? 'Cancel' : 'Modify Address'}</span>
                        </button>
                      )}
                    </div>

                    {isEditingAddress ? (
                      <form onSubmit={handleSaveAddressUpdate} className="space-y-3 text-xs">
                        <div>
                          <label className="block text-[#5A5955] mb-1">Street Address</label>
                          <input
                            type="text"
                            required
                            minLength={5}
                            maxLength={240}
                            value={editAddress}
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-black/20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[#5A5955] mb-1">City</label>
                            <input
                              type="text"
                              required
                              minLength={2}
                              maxLength={80}
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-black/20"
                            />
                          </div>
                          <div>
                            <label className="block text-[#5A5955] mb-1">Postal Code</label>
                            <input
                              type="text"
                              required
                              minLength={2}
                              maxLength={24}
                              value={editPostal}
                              onChange={(e) => setEditPostal(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-black/20 font-mono"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={addressUpdateLoading}
                          className="w-full py-2 px-4 rounded-lg bg-[#121212] text-[#FBFBF9] font-semibold"
                        >
                          {addressUpdateLoading ? 'Updating Waybill...' : 'Save Updated Destination'}
                        </button>
                      </form>
                    ) : (
                      <div className="space-y-2 text-xs text-[#4A4945]">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-[#121212] shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-[#121212]">
                              {activeOrder.customerName}
                            </p>
                            <p>{activeOrder.shippingAddressSummary}</p>
                            <p>
                              {activeOrder.shippingCity}, {activeOrder.shippingPostalCode} ·{' '}
                              {activeOrder.shippingCountry}
                            </p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-black/8 flex items-center justify-between">
                          <span className="text-[#6E6D68]">Payment Method</span>
                          <span className="font-mono font-semibold text-[#121212]">
                            {activeOrder.paymentMethod}
                            {activeOrder.paymentLast4 ? ` •••• ${activeOrder.paymentLast4}` : ''} ·{' '}
                            {activeOrder.paymentStatus}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Itemized Order Manifest */}
                  <div className="p-6 rounded-xl bg-white border border-black/10 space-y-4">
                    <h3 className="text-sm font-bold text-[#121212] border-b border-black/8 pb-3">
                      Allocated Pieces ({activeOrder.itemCount})
                    </h3>
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 text-xs">
                          <div className="w-12 h-12 rounded-md overflow-hidden bg-[#F2F1ED] shrink-0">
                            <ResilientImage
                              src={item.imageUrl}
                              alt={item.title}
                              category={item.category}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#121212] truncate">{item.title}</p>
                            <p className="text-[#6E6D68]">
                              {item.size} · {item.colorway} · Qty {item.quantity}
                            </p>
                          </div>
                          <span className="font-mono font-semibold tabular-nums text-[#121212]">
                            {(item.unitPrice * item.quantity).toLocaleString()} MAD
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 border-t border-black/8 flex justify-between text-xs font-semibold text-[#121212]">
                      <span>Order Total</span>
                      <span className="font-mono tabular-nums">
                        {activeOrder.totalAmount.toLocaleString()} MAD
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
