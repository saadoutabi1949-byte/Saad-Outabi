import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Truck, Ruler, Sparkles, Eye, Layers, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CatalogProduct } from '../data/catalog';
import { ResilientImage } from './ResilientImage';

interface ProductDetailModalProps {
  product: CatalogProduct | null;
  preferredShoeSize?: string;
  preferredApparelSize?: string;
  onClose: () => void;
  onAddToBag: (
    product: CatalogProduct,
    size: string,
    colorway: string,
    quantity: number,
    openCheckoutImmediately?: boolean
  ) => void;
}

type InspectionAngle = 'studio' | 'macro' | 'detail' | 'exploded';

const ANGLE_CONFIG: Record<
  InspectionAngle,
  { label: string; scale: number; x: number; y: number; rotate: number; caption: string }
> = {
  studio: {
    label: '01. Studio Profile',
    scale: 1,
    x: 0,
    y: 0,
    rotate: 0,
    caption: 'Full architectural silhouette in neutral studio illumination',
  },
  macro: {
    label: '02. Macro Material',
    scale: 1.32,
    x: -18,
    y: -12,
    rotate: -2,
    caption: 'Close-up weave, seam-tape tolerances, and surface grain',
  },
  detail: {
    label: '03. Sole & Hardware',
    scale: 1.26,
    x: 22,
    y: 16,
    rotate: 2.5,
    caption: 'Articulated chassis geometry and load-bearing hardware',
  },
  exploded: {
    label: '04. Callout Pins',
    scale: 1.08,
    x: 0,
    y: -4,
    rotate: -1,
    caption: 'Interactive technical specification nodes active on piece',
  },
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  preferredShoeSize,
  preferredApparelSize,
  onClose,
  onAddToBag,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColorway, setSelectedColorway] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [showSizeGuide, setShowSizeGuide] = useState<boolean>(false);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);
  const [inspectionAngle, setInspectionAngle] = useState<InspectionAngle>('studio');
  const [tilt, setTilt] = useState<{ rotateX: number; rotateY: number }>({
    rotateX: 0,
    rotateY: 0,
  });

  useEffect(() => {
    if (product) {
      const defaultSize =
        product.category === 'Sneakers' &&
        preferredShoeSize &&
        product.sizes.includes(preferredShoeSize)
          ? preferredShoeSize
          : product.category === 'Apparel' &&
            preferredApparelSize &&
            product.sizes.includes(preferredApparelSize)
          ? preferredApparelSize
          : product.sizes[Math.min(2, product.sizes.length - 1)];
      setSelectedSize(defaultSize);
      setSelectedColorway(product.colorways[0]);
      setQuantity(1);
      setShowSizeGuide(false);
      setInspectionAngle('studio');
      setTilt({ rotateX: 0, rotateY: 0 });
    }
  }, [product, preferredShoeSize, preferredApparelSize]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rotateX: -relY * 12,
      rotateY: relX * 14,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  const handleAdd = (buyNow = false) => {
    if (!product) return;
    onAddToBag(product, selectedSize, selectedColorway, quantity, buyNow);
    if (!buyNow) {
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1600);
    }
  };

  const activeTransform = ANGLE_CONFIG[inspectionAngle];

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          key="pdp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-0 md:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdp-title"
        >
          <motion.div
            key={product.id}
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-[#FBFBF9] border border-black/10 md:rounded-xl overflow-hidden my-auto max-h-screen md:max-h-[92vh] flex flex-col md:flex-row shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              aria-label="Close product details"
              className="absolute top-4 right-4 z-30 w-10 h-10 flex items-center justify-center rounded-lg bg-[#FBFBF9]/90 border border-black/10 text-[#121212] hover:bg-[#121212] hover:text-[#FBFBF9] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Left Interactive Studio Inspection Column */}
            <div className="w-full md:w-1/2 bg-[#F3F2EE] flex flex-col justify-between p-6 md:p-8 border-b md:border-b-0 md:border-r border-black/8">
              <div className="flex items-center justify-between gap-2 text-xs text-[#6E6D68] font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[#121212] font-semibold">fresh_men.1</span>
                  <span aria-hidden="true">·</span>
                  <span>{product.releaseCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>{product.weightSpec}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[#121212]">
                  <Eye className="w-3.5 h-3.5" />
                  <span>3D Inspect Active</span>
                </span>
              </div>

              {/* Interactive 3D Tilt & Zoom Showcase */}
              <div
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ perspective: 1000 }}
                className="my-5 relative aspect-4/3 w-full overflow-hidden rounded-xl bg-[#E9E7E0] border border-black/8 cursor-crosshair select-none"
              >
                <motion.div
                  key={`${product.id}-${selectedColorway}-${inspectionAngle}`}
                  initial={{ opacity: 0.75, scale: 0.94 }}
                  animate={{
                    opacity: 1,
                    scale: activeTransform.scale,
                    x: activeTransform.x,
                    y: activeTransform.y,
                    rotateZ: activeTransform.rotate,
                    rotateX: tilt.rotateX,
                    rotateY: tilt.rotateY,
                  }}
                  transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                  className="w-full h-full"
                >
                  <ResilientImage
                    src={product.imageUrl}
                    alt={product.title}
                    category={product.category}
                    fallbackLabel={product.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                {/* Animated Technical Callout Pins when in 'exploded' or 'macro' mode */}
                <AnimatePresence>
                  {(inspectionAngle === 'exploded' || inspectionAngle === 'macro') && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 pointer-events-none"
                    >
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.08 }}
                        className="absolute top-[26%] left-[22%] bg-[#121212]/90 text-[#FBFBF9] px-2.5 py-1 rounded-md text-[11px] font-mono shadow-md"
                      >
                        01 · {product.materials[0]?.slice(0, 32)}...
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.16 }}
                        className="absolute bottom-[22%] right-[16%] bg-[#121212]/90 text-[#FBFBF9] px-2.5 py-1 rounded-md text-[11px] font-mono shadow-md"
                      >
                        02 · {product.weightSpec} Precision Spec
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Live Angle Caption Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#121212]/80 backdrop-blur-xs text-[#FBFBF9] text-[11px]">
                  <span className="truncate">{activeTransform.caption}</span>
                  <Maximize2 className="w-3.5 h-3.5 shrink-0 ml-2 opacity-80" />
                </div>
              </div>

              {/* Interactive Inspection Angle Switcher */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#E5E3DC] rounded-lg">
                  {(Object.keys(ANGLE_CONFIG) as InspectionAngle[]).map((angleKey) => (
                    <button
                      key={angleKey}
                      type="button"
                      onClick={() => setInspectionAngle(angleKey)}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap truncate ${
                        inspectionAngle === angleKey
                          ? 'bg-[#121212] text-[#FBFBF9]'
                          : 'text-[#4A4945] hover:text-[#121212]'
                      }`}
                    >
                      {ANGLE_CONFIG[angleKey].label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/8 text-xs text-[#5A5955]">
                  <div>
                    <p className="text-[#8C8B85] mb-0.5">Origin Facility</p>
                    <p className="font-semibold text-[#121212]">{product.originFacility}</p>
                  </div>
                  <div>
                    <p className="text-[#8C8B85] mb-0.5">Dispatch Status</p>
                    <p className="font-semibold text-[#121212]">{product.availability}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Contiguous Purchase Module with Staggered Entrance */}
            <motion.div
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: 0.05 }}
              className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto pb-28 md:pb-10"
            >
              <div className="mb-5">
                <p className="text-xs text-[#6E6D68] mb-2">
                  fresh_men.1 <span aria-hidden="true">·</span> {product.category}{' '}
                  <span aria-hidden="true">·</span> {product.subtitle}
                </p>
                <div className="flex items-baseline justify-between gap-4">
                  <h2
                    id="pdp-title"
                    className="text-2xl md:text-3xl font-bold tracking-tight text-[#121212]"
                  >
                    {product.title}
                  </h2>
                  <span className="text-xl font-mono font-semibold tabular-nums text-[#121212] shrink-0">
                    {product.price.toLocaleString()} MAD
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#4A4945] leading-relaxed mb-6">
                {product.description}
              </p>

              {/* Colorway Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-[#121212]">Colorway Edition</span>
                  <span className="text-[#6E6D68]">{selectedColorway}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.colorways.map((color) => (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      key={color}
                      type="button"
                      onClick={() => setSelectedColorway(color)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                        selectedColorway === color
                          ? 'border-[#121212] bg-[#121212] text-[#FBFBF9]'
                          : 'border-black/15 bg-white text-[#121212] hover:border-black/40'
                      }`}
                    >
                      {color}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-[#121212]">Select Size</span>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(!showSizeGuide)}
                    className="inline-flex items-center gap-1 text-[#121212] underline underline-offset-4 hover:text-[#5A5955]"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>{showSizeGuide ? 'Hide Size Architecture' : 'Size Guide'}</span>
                  </button>
                </div>

                <AnimatePresence>
                  {showSizeGuide && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="mb-3 p-3.5 rounded-lg bg-[#F3F2EE] border border-black/8 text-xs text-[#4A4945]"
                    >
                      {product.category === 'Sneakers' ? (
                        <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                          <div className="font-semibold text-[#121212]">EU Size</div>
                          <div className="font-semibold text-[#121212]">US Men</div>
                          <div className="font-semibold text-[#121212]">Foot Length</div>
                          <div>EU 40</div><div>US 7.0</div><div>25.0 cm</div>
                          <div>EU 41</div><div>US 8.0</div><div>26.0 cm</div>
                          <div>EU 42</div><div>US 9.0</div><div>26.8 cm</div>
                          <div>EU 43</div><div>US 10.0</div><div>27.5 cm</div>
                          <div>EU 44</div><div>US 11.0</div><div>28.3 cm</div>
                          <div>EU 45</div><div>US 12.0</div><div>29.1 cm</div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                          <div className="font-semibold text-[#121212]">Size</div>
                          <div className="font-semibold text-[#121212]">Chest (cm)</div>
                          <div className="font-semibold text-[#121212]">Fit Cut</div>
                          <div>S</div><div>96–101 cm</div><div>Boxy Architectural</div>
                          <div>M</div><div>102–107 cm</div><div>Boxy Architectural</div>
                          <div>L</div><div>108–114 cm</div><div>Boxy Architectural</div>
                          <div>XL</div><div>115–122 cm</div><div>Boxy Architectural</div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {product.sizes.map((size) => (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-2.5 px-2 text-xs font-mono tabular-nums font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                        selectedSize === size
                          ? 'border-[#121212] bg-[#121212] text-[#FBFBF9]'
                          : 'border-black/15 bg-white text-[#121212] hover:border-black/40'
                      }`}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Quantity & Primary Purchase Actions (Desktop) */}
              <div className="hidden md:flex items-center gap-3 mb-8">
                <div className="flex items-center border border-black/15 rounded-lg bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2.5 text-sm font-mono hover:bg-black/5 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="px-3 text-sm font-mono tabular-nums font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="px-3.5 py-2.5 text-sm font-mono hover:bg-black/5 transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => handleAdd(false)}
                  className="flex-1 py-3 px-5 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold tracking-wide hover:bg-[#2A2A28] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to fresh_men.1 Bag</span>
                    </>
                  ) : (
                    <span>Add to Bag · {(product.price * quantity).toLocaleString()} MAD</span>
                  )}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => handleAdd(true)}
                  className="py-3 px-5 rounded-lg border border-[#121212] text-[#121212] text-xs font-semibold hover:bg-[#121212] hover:text-[#FBFBF9] transition-colors whitespace-nowrap"
                >
                  Instant Checkout
                </motion.button>
              </div>

              {/* Staggered Technical Specifications */}
              <div className="border-t border-black/10 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[#121212] inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Material Architecture & Specifications</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setInspectionAngle(inspectionAngle === 'exploded' ? 'studio' : 'exploded')
                    }
                    className="text-xs text-[#6E6D68] hover:text-[#121212] underline underline-offset-4"
                  >
                    {inspectionAngle === 'exploded' ? 'Reset View' : 'Highlight on Piece'}
                  </button>
                </div>

                <ul className="space-y-2 text-xs text-[#4A4945]">
                  {product.materials.map((mat, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.06 * (i + 1), duration: 0.18 }}
                      className="flex items-start gap-2"
                    >
                      <span className="font-mono text-[#8C8B85]">0{i + 1}.</span>
                      <span>{mat}</span>
                    </motion.li>
                  ))}
                </ul>

                <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-[#5A5955] border-t border-black/6">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-[#121212]" />
                    Real-Time DHL Priority Air Telemetry Included
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#121212]" />
                    fresh_men.1 Serialized NFC Ownership Record
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Mobile Sticky Purchase Bar (<= 15% viewport height) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FBFBF9] border-t border-black/15 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#6E6D68] truncate max-w-[140px]">
                  {selectedSize} · {selectedColorway}
                </p>
                <p className="text-sm font-mono font-semibold tabular-nums text-[#121212]">
                  {(product.price * quantity).toLocaleString()} MAD
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdd(false)}
                  className="py-2.5 px-4 rounded-lg bg-[#121212] text-[#FBFBF9] text-xs font-semibold whitespace-nowrap"
                >
                  {addedFeedback ? 'Added' : 'Add to Bag'}
                </button>
                <button
                  type="button"
                  onClick={() => handleAdd(true)}
                  className="py-2.5 px-3.5 rounded-lg border border-[#121212] text-[#121212] text-xs font-semibold whitespace-nowrap"
                >
                  Checkout
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
