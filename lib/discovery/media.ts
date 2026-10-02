import { SOURCED_REVIEW_IMAGES } from './media-batches';
/** Exact-model illustrations from their product pages. Images illustrate identity;
 * they do not establish configuration suitability or delivery availability.
 * Remote photos keep their original host and source attribution.
 */
const INITIAL_IMAGES: Record<string, { url: string; sourceUrl: string; alt: string }> = {
  'karcher-kira-b50-floor-cleaning': {
    url: 'https://d1y4tv7o00gnfq.cloudfront.net/mam/15330020/mainproduct/74c9059b-ef1f-4b66-844e-08a8babba3b9/d2.jpg',
    sourceUrl: 'https://www.karcher.com/de/de/professional/produkte/kira-b-50-p15330020',
    alt: 'Kärcher KIRA B 50, manufacturer product image for order 1.533-002.0',
  },
  'tennant-x4-rovr-floor-cleaning': {
    url: 'https://www.tennantco.com/content/dam/tennant/tennantco/products/machines/scrubber%20walk-behinds/x4-rovr/images/x4rovr-right%20dramatic-535x485.jpg/jcr:content/renditions/cq5dam.web.1280.1280.jpeg',
    sourceUrl: 'https://www.tennantco.com/de_de/1/machines/scrubbers/product.x4-rovr.autonome-scheuersaugmaschine.m-x4rovr.html',
    alt: 'Tennant X4 ROVR autonomous floor scrubber, manufacturer product image',
  },
  'nilfisk-liberty-sc50-floor-cleaning': {
    url: 'https://www.nilfisk.com/product-images-1920/SC50_v1.5_06_Front-Right-ps-Original-JLPLPTN.webp',
    sourceUrl: 'https://www.nilfisk.com/de-de/professional/produkte/bodenreinigung/autonome-bodenreinigung/sc50%2B56104508/',
    alt: 'Nilfisk Liberty SC50, manufacturer product image for SKU 56104508',
  },
  'pudu-cc1-floor-cleaning': {
    url: 'https://www.energiereich-consulting.com/wp-content/uploads/2023/11/robot2_en.png',
    sourceUrl: 'https://www.energiereich-consulting.com/wisch-saugroboter-pudu-cc1/',
    alt: 'Pudu CC1 standard model, as pictured in the EnergieReich Consulting product listing',
  },
  'mir-250-transport': {
    url: 'https://a.storyblok.com/f/230581/2000x1248/71f728b230/mir250-transparent.png',
    sourceUrl: 'https://mobile-industrial-robots.com/products/robots/mir250/specifications',
    alt: 'MiR250 mobile robot base, manufacturer product image',
  },
  'mir-600-transport': {
    url: 'https://a.storyblok.com/f/230581/672x421/347d9337e1/mir600-fallbackteaser.png',
    sourceUrl: 'https://mobile-industrial-robots.com/products/robots/mir600/specifications',
    alt: 'MiR600 mobile robot base, manufacturer product image',
  },
  'ur20-machine-tending': {
    url: 'https://a.storyblok.com/f/169662/3000x3000/102883592a/ur20-2022-warm50-1x1-68pct-15.png/m/736x552',
    sourceUrl: 'https://www.universal-robots.com/products/ur20-1750/',
    alt: 'Universal Robots UR20-1750 arm, manufacturer product image',
  },
  'boston-dynamics-spot-arm-inspection': {
    url: 'https://bostondynamics.com/wp-content/uploads/2023/06/arm-industrial-pipe-min.jpg',
    sourceUrl: 'https://bostondynamics.com/products/spot/arm/',
    alt: 'Boston Dynamics Spot with Arm in a manufacturer demonstration',
  },
};

export type ReviewImage = { url: string; sourceUrl: string; alt: string; checkedAt?: string };
export const REVIEW_IMAGES: Record<string, ReviewImage> = { ...INITIAL_IMAGES, ...Object.fromEntries(SOURCED_REVIEW_IMAGES.map(({reviewId, ...photo}) => [reviewId, photo])) };
