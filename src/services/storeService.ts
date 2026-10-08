import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  db,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  sanitizeString,
} from '../firebase';
import {
  CartItem,
  OrderRecord,
  UserPrivateInfoRecord,
  UserProfileRecord,
} from '../types';
import { SHIPMENT_STAGES } from '../data/catalog';

export async function ensureUserProfileAndPrivateInfo(user: User): Promise<{
  profile: UserProfileRecord;
  privateInfo: UserPrivateInfoRecord;
}> {
  const uid = sanitizeId(user.uid);
  const userRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');

  let profileData: UserProfileRecord;
  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const newProfile = {
        uid,
        displayName: sanitizeString(
          user.displayName || user.email?.split('@')[0] || 'Atelier Member',
          1,
          80,
          'Atelier Member'
        ),
        photoURL: sanitizeString(user.photoURL || '', 0, 500, ''),
        membershipTier: 'Atelier Member' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(userRef, newProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
      }
      profileData = {
        ...newProfile,
        createdAt: null,
        updatedAt: null,
      };
    } else {
      profileData = userSnap.data() as UserProfileRecord;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }

  let privateData: UserPrivateInfoRecord;
  try {
    const privSnap = await getDoc(privateRef);
    if (!privSnap.exists()) {
      const newPrivate = {
        uid,
        email: sanitizeString(user.email || 'member@fresh-men-1.ma', 3, 160, 'member@fresh-men-1.ma'),
        phone: '+212 6 61 24 80 00',
        shippingAddress: 'Boulevard d’Anfa 42, Maarif',
        shippingCity: 'Casablanca',
        shippingPostalCode: '20100',
        shippingCountry: 'Morocco',
        preferredSizeShoe: 'EU 42',
        preferredSizeApparel: 'M',
        savedCardLast4: '4829',
        savedCardBrand: 'Visa Infinite',
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(privateRef, newPrivate);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/private/info`);
      }
      privateData = {
        ...newPrivate,
        updatedAt: null,
      };
    } else {
      privateData = privSnap.data() as UserPrivateInfoRecord;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`);
  }

  return { profile: profileData, privateInfo: privateData };
}

export async function saveUserAccountSettings(
  uid: string,
  profileInput: {
    displayName: string;
    photoURL: string;
    membershipTier: 'Standard' | 'Atelier Member' | 'Archive Collector';
  },
  privateInput: Omit<UserPrivateInfoRecord, 'uid' | 'updatedAt'>
): Promise<void> {
  const cleanUid = sanitizeId(uid);
  const userRef = doc(db, 'users', cleanUid);
  const privateRef = doc(db, 'users', cleanUid, 'private', 'info');

  const validTier =
    profileInput.membershipTier === 'Standard' ||
    profileInput.membershipTier === 'Atelier Member' ||
    profileInput.membershipTier === 'Archive Collector'
      ? profileInput.membershipTier
      : 'Atelier Member';

  try {
    await updateDoc(userRef, {
      displayName: sanitizeString(profileInput.displayName, 1, 80, 'Atelier Member'),
      photoURL: sanitizeString(profileInput.photoURL, 0, 500, ''),
      membershipTier: validTier,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${cleanUid}`);
  }

  try {
    await updateDoc(privateRef, {
      email: sanitizeString(privateInput.email, 3, 160, 'member@vectra-atelier.ch'),
      phone: sanitizeString(privateInput.phone, 0, 40, ''),
      shippingAddress: sanitizeString(privateInput.shippingAddress, 0, 200, ''),
      shippingCity: sanitizeString(privateInput.shippingCity, 0, 80, ''),
      shippingPostalCode: sanitizeString(privateInput.shippingPostalCode, 0, 24, ''),
      shippingCountry: sanitizeString(privateInput.shippingCountry, 0, 60, ''),
      preferredSizeShoe: sanitizeString(privateInput.preferredSizeShoe, 0, 16, 'EU 42'),
      preferredSizeApparel: sanitizeString(privateInput.preferredSizeApparel, 0, 16, 'L'),
      savedCardLast4: sanitizeString(privateInput.savedCardLast4.replace(/\D/g, ''), 0, 4, ''),
      savedCardBrand: sanitizeString(privateInput.savedCardBrand, 0, 32, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${cleanUid}/private/info`);
  }
}

export interface CreateOrderCheckoutInput {
  user: User;
  cart: CartItem[];
  customerName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  paymentMethod: 'Card' | 'Express Pay' | 'Cash on Delivery';
  paymentLast4: string;
}

export async function createOrderWithItemsAndEvent(
  input: CreateOrderCheckoutInput
): Promise<string> {
  const uid = sanitizeId(input.user.uid);
  const randomSuffix = Math.floor(100000 + Math.random() * 899999);
  const orderId = sanitizeId(`ord_${Date.now()}_${randomSuffix}`);
  const orderNumber = sanitizeId(`VA-26-${randomSuffix}`);
  const trackingNumber = sanitizeId(`DHL-ZRH-${randomSuffix}CH`);

  const subtotal = Math.round(
    input.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );
  const shippingFee = subtotal >= 4000 ? 0 : 150;
  const totalAmount = subtotal + shippingFee;
  const itemCount = Math.min(
    100,
    Math.max(
      1,
      input.cart.reduce((sum, item) => sum + item.quantity, 0)
    )
  );

  const primaryItem = input.cart[0];
  const cleanCity = sanitizeString(input.shippingCity, 2, 80, 'Zurich');
  const cleanPostal = sanitizeString(input.shippingPostalCode, 2, 24, '8001');
  const cleanCountry = sanitizeString(input.shippingCountry, 2, 60, 'Switzerland');

  const estimatedDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const estimatedDelivery = sanitizeString(
    estimatedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    4,
    60,
    'Within 3 Business Days'
  );

  const paymentStatus =
    input.paymentMethod === 'Cash on Delivery' ? 'COD Pending' : 'Paid';

  const orderDocData = {
    orderNumber,
    userId: uid,
    customerName: sanitizeString(input.customerName, 1, 100, 'Atelier Client'),
    shippingAddressSummary: sanitizeString(
      input.shippingAddress,
      5,
      240,
      'Bahnhofstrasse 42, Suite 3B'
    ),
    shippingCity: cleanCity,
    shippingPostalCode: cleanPostal,
    shippingCountry: cleanCountry,
    paymentMethod: input.paymentMethod,
    paymentLast4: sanitizeString(
      input.paymentMethod === 'Cash on Delivery'
        ? ''
        : input.paymentLast4.replace(/\D/g, ''),
      0,
      4,
      ''
    ),
    paymentStatus,
    subtotal,
    shippingFee,
    totalAmount,
    itemCount,
    primaryItemTitle: sanitizeString(
      primaryItem?.product.title || 'Vectra Atelier Piece',
      1,
      120,
      'Vectra Atelier Piece'
    ),
    primaryItemImage: sanitizeString(
      primaryItem?.product.imageUrl || '/src/assets/images/sneaker_carbon_runner_1791469119324.jpg',
      1,
      300,
      '/src/assets/images/sneaker_carbon_runner_1791469119324.jpg'
    ),
    shipmentStatus: 'Order Confirmed' as const,
    carrier: 'DHL Express Priority Air',
    trackingNumber,
    currentHub: 'Zurich Digital Fulfillment Desk',
    destinationHub: sanitizeString(`${cleanCity} (${cleanPostal})`, 2, 100, 'Zurich (8001)'),
    estimatedDelivery,
    progressPercent: 12,
    lastStatusNote: 'Payment verified and garment allocation locked in Zurich vault.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Step 1: Write parent Order document first so Master Gate exists() & get() succeed
  try {
    await setDoc(doc(db, 'orders', orderId), orderDocData);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
  }

  // Step 2: Write each OrderItem in /orders/{orderId}/items/{itemId}
  for (let i = 0; i < input.cart.length; i++) {
    const cartItem = input.cart[i];
    const itemId = sanitizeId(`item_${i + 1}_${cartItem.product.id}`);
    const itemData = {
      orderId,
      userId: uid,
      productId: sanitizeId(cartItem.product.id),
      title: sanitizeString(cartItem.product.title, 1, 120, 'Atelier Item'),
      category: cartItem.product.category,
      size: sanitizeString(cartItem.size, 1, 20, 'EU 42'),
      colorway: sanitizeString(cartItem.colorway, 1, 60, 'Standard'),
      unitPrice: Math.round(cartItem.product.price),
      quantity: Math.min(50, Math.max(1, Math.round(cartItem.quantity))),
      imageUrl: sanitizeString(cartItem.product.imageUrl, 1, 300, '/placeholder.jpg'),
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'orders', orderId, 'items', itemId), itemData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}/items/${itemId}`);
    }
  }

  // Step 3: Write initial ShipmentEvent in /orders/{orderId}/events/{eventId}
  const initialEventId = sanitizeId('evt_stage_0');
  const nowLabel = sanitizeString(
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    }),
    2,
    60,
    'Just now'
  );
  try {
    await setDoc(doc(db, 'orders', orderId, 'events', initialEventId), {
      orderId,
      userId: uid,
      statusStage: 'Order Confirmed',
      location: 'Zurich Digital Fulfillment Desk',
      description: 'Order verified and assigned waybill ' + trackingNumber + '.',
      timestampLabel: nowLabel,
      stepIndex: 0,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}/events/${initialEventId}`);
  }

  return orderId;
}

export async function advanceOrderShipmentStage(order: OrderRecord): Promise<void> {
  if (order.shipmentStatus === 'Delivered') {
    return;
  }

  const currentIdx = SHIPMENT_STAGES.findIndex((s) => s.stage === order.shipmentStatus);
  const nextIdx = Math.min(SHIPMENT_STAGES.length - 1, currentIdx + 1);
  const nextStageSpec = SHIPMENT_STAGES[nextIdx];

  const resolvedHub =
    nextStageSpec.stage === 'Out for Delivery'
      ? sanitizeString(`${order.shippingCity} Local Courier Hub`, 2, 100, 'Local Courier Hub')
      : nextStageSpec.stage === 'Delivered'
      ? sanitizeString(
          `${order.shippingCity} · ${order.shippingPostalCode}`,
          2,
          100,
          'Destination Address'
        )
      : nextStageSpec.defaultHub;

  const updatedPaymentStatus =
    nextStageSpec.stage === 'Delivered' && order.paymentStatus === 'COD Pending'
      ? 'Paid'
      : order.paymentStatus;

  const cleanOrderId = sanitizeId(order.id);

  try {
    await updateDoc(doc(db, 'orders', cleanOrderId), {
      shipmentStatus: nextStageSpec.stage,
      currentHub: sanitizeString(resolvedHub, 2, 100, 'Transit Hub'),
      progressPercent: nextStageSpec.progressPercent,
      lastStatusNote: sanitizeString(nextStageSpec.descriptionTemplate, 2, 240, 'Status updated.'),
      paymentStatus: updatedPaymentStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${cleanOrderId}`);
  }

  const eventId = sanitizeId(`evt_stage_${nextStageSpec.stepIndex}_${Date.now()}`);
  const nowLabel = sanitizeString(
    new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      month: 'short',
      day: 'numeric',
    }),
    2,
    60,
    'Just now'
  );

  try {
    await setDoc(doc(db, 'orders', cleanOrderId, 'events', eventId), {
      orderId: cleanOrderId,
      userId: sanitizeId(order.userId),
      statusStage: nextStageSpec.stage,
      location: sanitizeString(resolvedHub, 2, 100, 'Transit Hub'),
      description: sanitizeString(nextStageSpec.descriptionTemplate, 2, 240, 'Scan recorded.'),
      timestampLabel: nowLabel,
      stepIndex: nextStageSpec.stepIndex,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${cleanOrderId}/events/${eventId}`);
  }
}

export async function updateOrderShippingAddressBeforeDispatch(
  order: OrderRecord,
  newAddress: string,
  newCity: string,
  newPostalCode: string
): Promise<void> {
  if (order.shipmentStatus !== 'Order Confirmed') {
    throw new Error('Shipping address can only be modified while in Order Confirmed stage.');
  }
  const cleanOrderId = sanitizeId(order.id);
  const cleanAddr = sanitizeString(newAddress, 5, 240, order.shippingAddressSummary);
  const cleanCity = sanitizeString(newCity, 2, 80, order.shippingCity);
  const cleanPostal = sanitizeString(newPostalCode, 2, 24, order.shippingPostalCode);

  try {
    await updateDoc(doc(db, 'orders', cleanOrderId), {
      shippingAddressSummary: cleanAddr,
      shippingCity: cleanCity,
      shippingPostalCode: cleanPostal,
      lastStatusNote: sanitizeString(
        `Delivery destination updated to ${cleanCity} (${cleanPostal}) prior to quality inspection.`,
        2,
        240,
        'Delivery destination updated.'
      ),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${cleanOrderId}`);
  }
}
