export interface CatalogProduct {
  id: string;
  title: string;
  subtitle: string;
  category: 'Sneakers' | 'Apparel';
  price: number;
  releaseCode: string;
  imageUrl: string;
  colorways: string[];
  sizes: string[];
  availability: string;
  weightSpec: string;
  originFacility: string;
  materials: string[];
  description: string;
}

export const BRAND_LOGO_IMAGE = '/src/assets/images/fresh_men_logo_badge_1791472534885.jpg';
export const HERO_CAMPAIGN_IMAGE = '/src/assets/images/collection_ck_tommy_guess_1791472546568.jpg';

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'prod_tommy_black_polo',
    title: 'Tommy Hilfiger Black Striped Collar Polo',
    subtitle: 'Classic Piqué Short-Sleeve Polo with White Tipping Stripes',
    category: 'Apparel',
    price: 890,
    releaseCode: 'FM1-POLO-01',
    imageUrl: '/src/assets/images/polo_tommy_black_striped_1791472556353.jpg',
    colorways: ['Jet Black / White Stripe', 'Navy / White Stripe'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    availability: 'In Stock · Ready to Ship',
    weightSpec: '240g Combed Cotton Piqué',
    originFacility: 'fresh_men.1 Official Selection',
    materials: [
      '100% organic breathable combed cotton piqué weave',
      'Contrast twin white tipping stripes on rib-knit collar and cuffs',
      'Three-button placket with pearlescent engraved buttons',
      'Signature embroidered flag emblem on left chest',
    ],
    description:
      'A signature smart-casual staple from fresh_men.1. Crafted in breathable black cotton piqué with crisp double white stripes along the collar and sleeve cuffs for a sharp, tailored fit.',
  },
  {
    id: 'prod_ua_blue_polo',
    title: 'Under Armour Royal Blue Sport Polo',
    subtitle: 'Moisture-Wicking Performance Piqué Athletic Polo',
    category: 'Apparel',
    price: 750,
    releaseCode: 'FM1-POLO-02',
    imageUrl: '/src/assets/images/polo_under_armour_blue_1791472565429.jpg',
    colorways: ['Royal Blue / Anthracite', 'Cobalt Blue'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    availability: 'In Stock · Ready to Ship',
    weightSpec: '195g Performance Micro-Piqué',
    originFacility: 'fresh_men.1 Sport Selection',
    materials: [
      'Textured breathable micro-piqué fabric that resists snagging and pilling',
      '4-way stretch structure moves effortlessly in every direction',
      'Rapid moisture-wicking finish dries quickly in warm climates',
      'Structured self-fabric collar with two tonal buttons and chest logo',
    ],
    description:
      'Engineered for all-day comfort and athletic versatility. This vibrant royal blue Under Armour polo combines a clean classic profile with ultra-lightweight moisture-wicking technology.',
  },
  {
    id: 'prod_ck_tommy_guess_pack',
    title: 'Calvin Klein, Tommy Hilfiger, Guess & MK Complete Collection',
    subtitle: 'Tees, Boxed Leather Wallets, CK Trunks & Adidas Crew Socks Set',
    category: 'Apparel',
    price: 2490,
    releaseCode: 'FM1-PACK-01',
    imageUrl: '/src/assets/images/collection_ck_tommy_guess_1791472546568.jpg',
    colorways: ['Full Signature Pack (Black & White)', 'Monochrome Edition'],
    sizes: ['S', 'M', 'L', 'XL'],
    availability: 'Limited Pack · Ready to Ship',
    weightSpec: 'Complete 7-Piece Boxed Bundle',
    originFacility: 'fresh_men.1 Curated Box',
    materials: [
      'Calvin Klein CO.VINTA embroidered white tee & classic white crewneck tee',
      'Tommy Hilfiger black signature chest-logo cotton t-shirt',
      'Michael Kors monogram & Guess Los Angeles boxed leather bifold wallets',
      'Calvin Klein Cotton Stretch 3-pack trunks & Adidas Originals crew socks bundle',
    ],
    description:
      'The ultimate fresh_men.1 menswear & accessories collection in one package. Includes premium Calvin Klein and Tommy Hilfiger tees, boxed Guess and Michael Kors leather wallets, Calvin Klein Cotton Stretch trunks, and Adidas crew socks.',
  },
  {
    id: 'prod_arcus_800',
    title: 'Arcus-800 Carbon Runner Sneaker',
    subtitle: 'Articulated Matte-Black & Carbon Plate Athletic Sneaker',
    category: 'Sneakers',
    price: 1450,
    releaseCode: 'FM1-SNK-01',
    imageUrl: '/src/assets/images/sneaker_carbon_runner_1791469119324.jpg',
    colorways: ['Obsidian / Carbon', 'Anthracite / Slate'],
    sizes: ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'],
    availability: 'In Stock · Ready to Ship',
    weightSpec: '295g (EU 42)',
    originFacility: 'fresh_men.1 Footwear Division',
    materials: [
      '3K woven carbon-fiber torsion bridge',
      'Ballistic ripstop mesh upper with welded overlays',
      'Dual-density cushioned midsole',
      'High-grip lugged outsole for daily urban wear',
    ],
    description:
      'Built for daily street comfort and athletic performance. Features a visible carbon-fiber midfoot bridge and sculpted geometric heel cushioning.',
  },
  {
    id: 'prod_monolith_court',
    title: 'Monolith Suede Court Low Sneaker',
    subtitle: 'Chalk-White Leather & Warm Suede Classic Trainer',
    category: 'Sneakers',
    price: 1290,
    releaseCode: 'FM1-SNK-02',
    imageUrl: '/src/assets/images/sneaker_chalk_court_1791469130954.jpg',
    colorways: ['Chalk / Warm Taupe', 'Bone / Raw Gum'],
    sizes: ['EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44'],
    availability: 'In Stock · Ready to Ship',
    weightSpec: '360g (EU 42)',
    originFacility: 'fresh_men.1 Footwear Division',
    materials: [
      'Smooth white leather quarter panels',
      'Soft velour suede toe-box overlays',
      '360-degree stitched natural gum rubber cupsole',
      'Cushioned anatomical footbed',
    ],
    description:
      'Clean, versatile court sneaker crafted with chalk-white leather, contrast suede panels, and a classic gum sole that pairs effortlessly with polos and denim.',
  },
  {
    id: 'prod_archive_hoodie',
    title: 'Signature 520gsm Heavyweight Hoodie',
    subtitle: 'Washed Black Structured Cotton Pullover Hoodie',
    category: 'Apparel',
    price: 950,
    releaseCode: 'FM1-APR-03',
    imageUrl: '/src/assets/images/apparel_heavy_hoodie_1791469151182.jpg',
    colorways: ['Washed Obsidian', 'Weathered Graphite'],
    sizes: ['S', 'M', 'L', 'XL'],
    availability: 'In Stock · Ready to Ship',
    weightSpec: '890g (Size L)',
    originFacility: 'fresh_men.1 Casual Division',
    materials: [
      '100% combed cotton, 520gsm French terry loopback',
      'Double-layered hood for a structured profile',
      '2x2 high-density ribbed cuffs and waist hem',
      'Soft enzyme wash finish',
    ],
    description:
      'Heavyweight everyday pullover hoodie with structured drop shoulders and ultra-soft brushed interior fleece.',
  },
];

export interface ShipmentStageSpec {
  stage:
    | 'Order Confirmed'
    | 'Quality Inspection'
    | 'Dispatched from Atelier'
    | 'In Transit'
    | 'Out for Delivery'
    | 'Delivered';
  stepIndex: number;
  progressPercent: number;
  defaultHub: string;
  descriptionTemplate: string;
}

export const SHIPMENT_STAGES: ShipmentStageSpec[] = [
  {
    stage: 'Order Confirmed',
    stepIndex: 0,
    progressPercent: 12,
    defaultHub: 'fresh_men.1 Central Fulfillment Hub',
    descriptionTemplate: 'Payment verified and garment allocation locked for dispatch.',
  },
  {
    stage: 'Quality Inspection',
    stepIndex: 1,
    progressPercent: 30,
    defaultHub: 'fresh_men.1 Quality Control Station',
    descriptionTemplate: 'Passed 18-point garment, stitching, and packaging inspection.',
  },
  {
    stage: 'Dispatched from Atelier',
    stepIndex: 2,
    progressPercent: 52,
    defaultHub: 'Express Courier Sortation Facility',
    descriptionTemplate: 'Handed over to Express Priority courier with protective packaging.',
  },
  {
    stage: 'In Transit',
    stepIndex: 3,
    progressPercent: 74,
    defaultHub: 'Regional Logistics Distribution Hub',
    descriptionTemplate: 'Parcel routed on priority line to destination city.',
  },
  {
    stage: 'Out for Delivery',
    stepIndex: 4,
    progressPercent: 90,
    defaultHub: 'Local City Courier Dispatch Facility',
    descriptionTemplate: 'Loaded onto local courier vehicle for delivery today.',
  },
  {
    stage: 'Delivered',
    stepIndex: 5,
    progressPercent: 100,
    defaultHub: 'Customer Destination Address',
    descriptionTemplate: 'Delivered and signed for at recipient address.',
  },
];
