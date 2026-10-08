import { CatalogProduct } from './data/catalog';

export interface CartItem {
  product: CatalogProduct;
  size: string;
  colorway: string;
  quantity: number;
}

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  photoURL: string;
  membershipTier: 'Standard' | 'Atelier Member' | 'Archive Collector';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateInfoRecord {
  uid: string;
  email: string;
  phone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  preferredSizeShoe: string;
  preferredSizeApparel: string;
  savedCardLast4: string;
  savedCardBrand: string;
  updatedAt?: unknown;
}

export type ShipmentStatusType =
  | 'Order Confirmed'
  | 'Quality Inspection'
  | 'Dispatched from Atelier'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered';

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  shippingAddressSummary: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  paymentMethod: 'Card' | 'Express Pay' | 'Cash on Delivery';
  paymentLast4: string;
  paymentStatus: 'Paid' | 'Authorized' | 'COD Pending' | 'Refunded';
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  itemCount: number;
  primaryItemTitle: string;
  primaryItemImage: string;
  shipmentStatus: ShipmentStatusType;
  carrier: string;
  trackingNumber: string;
  currentHub: string;
  destinationHub: string;
  estimatedDelivery: string;
  progressPercent: number;
  lastStatusNote: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
  updatedAt?: { seconds: number; nanoseconds: number } | null;
}

export interface OrderItemRecord {
  id: string;
  orderId: string;
  userId: string;
  productId: string;
  title: string;
  category: 'Sneakers' | 'Apparel';
  size: string;
  colorway: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
}

export interface ShipmentEventRecord {
  id: string;
  orderId: string;
  userId: string;
  statusStage: ShipmentStatusType;
  location: string;
  description: string;
  timestampLabel: string;
  stepIndex: number;
  createdAt?: { seconds: number; nanoseconds: number } | null;
}
