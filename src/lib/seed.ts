import type {
  CarouselSlide,
  ContactMessage,
  LandingContent,
  LandingMedia,
  Order,
  Product,
  SiteContent,
  StoreSnapshot,
} from './types'

const img = (file: string) => `/images/${file}`
const created = '2026-08-01T10:00:00.000Z'

export const LANDING_OFFER_ID = 'prod_landing_offer'

export function catalogProducts(products: Product[]) {
  return products.filter((item) => item.id !== LANDING_OFFER_ID)
}

export function isCatalogProductId(id: string | undefined) {
  const value = id?.trim() ?? ''
  return Boolean(value && value !== LANDING_OFFER_ID && value !== 'prod_papaya')
}

export const SITE = {
  name: 'JS Agro Shop',
  nameEn: 'JS Agro Shop',
  slogan: 'পণ্য নয়, আস্থা বিনিময় করি',
  tagline: 'দেশি-বিদেশি ফল ও সবজির চারা · নাটোর সদর',
  phone: '01725-250188',
  phone2: '01813-514791',
  whatsapp: '8801813514791',
  email: 'jsagroshop63@gmail.com',
  address: 'নাটোর সদর, নাটোর, বাংলাদেশ',
  hours: 'WhatsApp / Imo — সারাদিন যোগাযোগ করুন',
  facebook: 'https://www.facebook.com/share/1CnLBxJqHr/',
  logo: '/js-agro-shop-logo.png',
  followers: '২০ হাজার ফলোয়ার',
}

export const seedSite: SiteContent = {
  name: SITE.name,
  nameEn: SITE.nameEn,
  slogan: SITE.slogan,
  tagline: SITE.tagline,
  about:
    'সকল প্রকার দেশি-বিদেশি ফল ও সবজির চারা। সারা বাংলাদেশে কুরিয়ার ও বাস সার্ভিসে ডেলিভারি। প্রতিটি চারায় শতভাগ জাতের গ্যারান্টি।',
  phone: SITE.phone,
  phone2: SITE.phone2,
  email: SITE.email,
  address: SITE.address,
  hours: SITE.hours,
  facebook: SITE.facebook,
  homeBannerTitle: 'হাইব্রিড পেঁপে চারা · শতভাগ জাতের গ্যারান্টি',
  homeBannerCta: 'অফার পেজ দেখুন',
  headerOfferLabel: 'অফার',
}

export function normalizeSite(raw?: Partial<SiteContent> | null): SiteContent {
  const src = raw ?? {}
  return {
    name: src.name?.trim() || seedSite.name,
    nameEn: src.nameEn?.trim() || seedSite.nameEn,
    slogan: src.slogan?.trim() || seedSite.slogan,
    tagline: src.tagline?.trim() || seedSite.tagline,
    about: src.about?.trim() || seedSite.about,
    phone: src.phone?.trim() || seedSite.phone,
    phone2: src.phone2?.trim() || seedSite.phone2,
    email: src.email?.trim() || seedSite.email,
    address: src.address?.trim() || seedSite.address,
    hours: src.hours?.trim() || seedSite.hours,
    facebook: src.facebook?.trim() || seedSite.facebook,
    homeBannerTitle: src.homeBannerTitle?.trim() || seedSite.homeBannerTitle,
    homeBannerCta: src.homeBannerCta?.trim() || seedSite.homeBannerCta,
    headerOfferLabel: src.headerOfferLabel?.trim() || seedSite.headerOfferLabel,
  }
}

export function siteWhatsapp(site: SiteContent) {
  const digits = site.phone2.replace(/\D/g, '')
  if (digits.startsWith('880')) return digits
  if (digits.startsWith('0')) return `88${digits}`
  return SITE.whatsapp
}

export const seedProducts: Product[] = [
  {
    id: 'prod_offer_pack',
    name: 'দেশি-বিদেশি ফলের চারা প্যাক',
    headline: 'রামবুটান, নারিকেল, আম, কাঁঠালসহ সিলেক্টেড চারা',
    description:
      'JS Agro Shop, নাটোর সদর থেকে সুস্থ সবল দেশি-বিদেশি ফলের চারা। সারা বাংলাদেশে কুরিয়ার ও বাস সার্ভিসে ডেলিভারি। প্রতিটি চারায় শতভাগ জাতের গ্যারান্টি। পণ্য নয় — আস্থা বিনিময় করি।',
    price: 1700,
    comparePrice: 6200,
    image: img('mango-red.jpg'),
    gallery: [img('mango-red.jpg'), img('mango-yellow.jpg'), img('fruits.jpg'), img('hero-delivery.jpg')],
    category: 'প্যাকেজ অফার',
    stock: 80,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_papaya',
    name: 'হাইব্রিড পেঁপে চারা',
    headline: '১০০% হাইব্রিড · শতভাগ জাতের গ্যারান্টি',
    description:
      'সিজনের সেরা ও স্বাস্থ্যকর হাইব্রিড পেঁপে চারা। JS Agro Shop-এর প্রতিটি চারায় শতভাগ জাতের গ্যারান্টি। সারা দেশে কুরিয়ার ও বাস সার্ভিসে ডেলিভারি। WhatsApp/Imo: 01813-514791, 01725-250188।',
    price: 150,
    comparePrice: 250,
    image: img('fruits.jpg'),
    gallery: [img('fruits.jpg'), img('mango-yellow.jpg')],
    category: 'পেঁপে',
    stock: 120,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_surjodim',
    name: 'জাপানের সুর্যডিম আম',
    headline: 'মিয়াজাকি আম — লাল রঙের প্রিমিয়াম জাত',
    description:
      'জাপানের বিখ্যাত মিয়াজাকি/সুর্যডিম আম। ফলের রং গাঢ় লাল, স্বাদ অত্যন্ত মিষ্টি ও ক্রিমি। মাতৃকলম চারা, দ্রুত ফলনশীল। বাড়ির ছাদ বা বাগান — দুই জায়গাতেই চাষযোগ্য।',
    price: 850,
    comparePrice: 1200,
    image: img('mango-yellow.jpg'),
    gallery: [img('mango-yellow.jpg'), img('mango-red.jpg')],
    category: 'আম',
    stock: 45,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_himsagar',
    name: 'হিমসাগর আম',
    headline: 'বাংলার ক্লাসিক মিষ্টি আমের চারা',
    description:
      'হিমসাগর আম বাংলাদেশের সবচেয়ে জনপ্রিয় জাতগুলোর একটি। সুগন্ধি, মিষ্টি ও আঁশ কম। JS Agro Shop থেকে সুস্থ কলম চারা, সারা দেশে ডেলিভারি।',
    price: 400,
    comparePrice: 550,
    image: img('mango-thai.jpg'),
    gallery: [img('mango-thai.jpg'), img('mango-yellow.jpg')],
    category: 'আম',
    stock: 65,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_amrapali',
    name: 'আম্রপালি আম',
    headline: 'ঘন ফলন · বাণিজ্যিক চাষের জন্য আদর্শ',
    description:
      'আম্রপালি আম ঘন ফলনশীল ও মিষ্টি জাত। বাড়ির বাগান ও বাণিজ্যিক বাগান দুটোতেই উপযোগী। নাটোর সদর থেকে কুরিয়ারে পাঠানো হয়।',
    price: 380,
    comparePrice: 500,
    image: img('mango-palmer.jpg'),
    gallery: [img('mango-palmer.jpg')],
    category: 'আম',
    stock: 58,
    featured: false,
    createdAt: created,
  },
  {
    id: 'prod_chiangmai',
    name: 'চিয়াং মাই আম',
    headline: 'থাই ল্যান্ডের সুমিষ্ট আমের চারা',
    description:
      'চিয়াং মাই আম থাইল্যান্ডের জনপ্রিয় জাত। আঁশবিহীন, রসালো ও সুগন্ধি। বাংলাদেশের আবহাওয়ায় ভালো ফলন দেয়। কলম চারা হওয়ায় দ্বিতীয় বছরেই ফল আসা শুরু করে।',
    price: 650,
    comparePrice: 900,
    image: img('mango-thai.jpg'),
    gallery: [img('mango-thai.jpg'), img('mango-yellow.jpg')],
    category: 'আম',
    stock: 60,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_palmer',
    name: 'আমেরিকান রেড পালমার আম',
    headline: 'লাল চামড়ার বড় সাইজের আম',
    description:
      'রেড পালমার আম দেখতে আকর্ষণীয় লাল ও ওজনে বড়। রপ্তানিমানের জাত। বাণিজ্যিক বাগানের জন্য আদর্শ। সুস্থ সবল কলম চারা সরবরাহ করা হয়।',
    price: 750,
    comparePrice: 1100,
    image: img('mango-palmer.jpg'),
    gallery: [img('mango-palmer.jpg'), img('mango-red.jpg')],
    category: 'আম',
    stock: 38,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_taiwan',
    name: 'তাইওয়ান রেড আম',
    headline: 'উজ্জ্বল লাল, কম আঁশ, বেশি মিষ্টি',
    description:
      'তাইওয়ান রেড আমের চামড়া উজ্জ্বল লাল এবং শাঁস গাঢ় কমলা। আঁশ কম, স্বাদ মিষ্টি। বাড়ির বাগানের শোভা ও ফলন দুটোই পাবেন।',
    price: 700,
    comparePrice: 950,
    image: img('mango-red.jpg'),
    gallery: [img('mango-red.jpg'), img('mango-palmer.jpg')],
    category: 'আম',
    stock: 42,
    featured: false,
    createdAt: created,
  },
  {
    id: 'prod_coconut',
    name: 'ভিয়েতনামি হাইব্রিড নারিকেল',
    headline: 'খাটো জাত · অল্প সময়ে ফলন',
    description:
      'হাইব্রিড বামন নারিকেল চারা। সাধারণ নারিকেলের তুলনায় অনেক তাড়াতাড়ি ও বেশি ফলন দেয়। খাটো জাত হওয়ায় ছোট জমিতেও লাগানো যায়।',
    price: 550,
    comparePrice: 800,
    image: img('coconut.jpg'),
    gallery: [img('coconut.jpg'), img('hero-garden.jpg')],
    category: 'নারিকেল',
    stock: 70,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_rambutan',
    name: 'মালয়েশিয়ান রাম্বুটান',
    headline: 'আকর্ষণীয় লাল ফল, মিষ্টি শাঁস',
    description:
      'মালয়েশিয়ান রাম্বুটান গাছের চারা। ফল দেখতে লিচুর মতো তবে আরও রসালো। বাংলাদেশের দক্ষিণাঞ্চল ও মধ্যাঞ্চলে ভালো হয়।',
    price: 600,
    comparePrice: 850,
    image: img('fruits.jpg'),
    gallery: [img('fruits.jpg'), img('mango-red.jpg')],
    category: 'বিদেশি ফল',
    stock: 28,
    featured: false,
    createdAt: created,
  },
  {
    id: 'prod_jackfruit',
    name: 'বারোমাসি পিংক কাঠাল',
    headline: 'আঠাবিহীন · বছরজুড়ে ফলন',
    description:
      'বারোমাসি পিংক কাঠাল — আঠাবিহীন এবং সারা বছর ফল ধরে। শাঁস গোলাপি, সুগন্ধি ও মিষ্টি। বাণিজ্যিক চাষের জন্য খুবই লাভজনক জাত।',
    price: 900,
    comparePrice: 1300,
    image: img('hero-delivery.jpg'),
    gallery: [img('hero-delivery.jpg'), img('fruits.jpg')],
    category: 'কাঠাল',
    stock: 22,
    featured: true,
    createdAt: created,
  },
  {
    id: 'prod_jambura',
    name: 'বারোমাসি লাল জাম্বুরা',
    headline: 'সারা বছর ফলন · ভিটামিন সি সমৃদ্ধ',
    description:
      'বারোমাসি লাল জাম্বুরা চারা। ফল বড়, রসালো। বাড়ির আঙিনায় লাগালে নিয়মিত ফলন পাওয়া যায়। JS Agro Shop, নাটোর সদর।',
    price: 450,
    comparePrice: 650,
    image: img('citrus.jpg'),
    gallery: [img('citrus.jpg')],
    category: 'সাইট্রাস',
    stock: 40,
    featured: false,
    createdAt: created,
  },
  {
    id: 'prod_litchi',
    name: 'সিডলেস লিচু',
    headline: 'বিচিবিহীন লিচু — সহজে খাওয়া যায়',
    description:
      'সিডলেস লিচু চারা। ফলের বিচি নেই বা খুবই ছোট, তাই খাওয়া আরামদায়ক। সুগন্ধি ও মিষ্টি জাত, বাগানের জন্য দুর্লভ সংগ্রহ।',
    price: 720,
    comparePrice: 1000,
    image: img('apple.jpg'),
    gallery: [img('apple.jpg'), img('fruits.jpg')],
    category: 'লিচু',
    stock: 33,
    featured: false,
    createdAt: created,
  },
  {
    id: 'prod_lotkon',
    name: 'লটকন চারা',
    headline: 'দেশি মিষ্টি লটকনের সুস্থ চারা',
    description:
      'লটকন বাংলার প্রিয় ফল। JS Agro Shop থেকে সুস্থ চারা, কুরিয়ার ও বাসে সারা দেশে পাঠানো হয়।',
    price: 300,
    comparePrice: 420,
    image: img('apple.jpg'),
    gallery: [img('apple.jpg')],
    category: 'দেশি ফল',
    stock: 48,
    featured: false,
    createdAt: created,
  },
  {
    id: 'prod_supari',
    name: 'ভিয়েতনাম হাইব্রিড সুপারি',
    headline: 'খাটো জাত · দ্রুত ফলনশীল সুপারি চারা',
    description:
      'ভিয়েতনামি হাইব্রিড সুপারি চারা। খাটো জাত, দ্রুত ফলন। নাটোর সদর থেকে সারা বাংলাদেশে ডেলিভারি।',
    price: 350,
    comparePrice: 500,
    image: img('indoor.jpg'),
    gallery: [img('indoor.jpg'), img('greenhouse.jpg')],
    category: 'সুপারি',
    stock: 44,
    featured: false,
    createdAt: created,
  },
]

export const seedSlides: CarouselSlide[] = [
  {
    id: 'slide_garden',
    image: img('hero-garden.jpg'),
    title: 'পণ্য নয়, আস্থা বিনিময় করি',
    subtitle: 'দেশি-বিদেশি ফল ও সবজির চারা · নাটোর সদর',
    ctaText: 'পণ্য দেখুন',
    ctaLink: '/#products',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'slide_offer',
    image: img('hero-offer.jpg'),
    title: 'হাইব্রিড পেঁপে চারা',
    subtitle: 'শতভাগ জাতের গ্যারান্টি · সারা দেশে কুরিয়ার ও বাস ডেলিভারি',
    ctaText: 'এখনই অর্ডার করুন',
    ctaLink: '/offer',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'slide_quality',
    image: img('greenhouse.jpg'),
    title: 'JS Agro Shop · নাটোর',
    subtitle: '২০ হাজার ফলোয়ারের আস্থা · সুস্থ সবল চারা',
    ctaText: 'অফার দেখুন',
    ctaLink: '/offer',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'slide_delivery',
    image: img('hero-delivery.jpg'),
    title: 'সারা বাংলাদেশে ডেলিভারি',
    subtitle: 'কুরিয়ার ও বাস সার্ভিস · WhatsApp/Imo: 01813-514791, 01725-250188',
    ctaText: 'যোগাযোগ করুন',
    ctaLink: '/contact',
    sortOrder: 4,
    active: true,
  },
]

export const seedMedia: LandingMedia[] = [
  { id: 'media_1', type: 'image', url: img('fruits.jpg'), title: 'হাইব্রিড পেঁপে', caption: 'শতভাগ জাতের গ্যারান্টি', sortOrder: 1, active: true },
  { id: 'media_2', type: 'image', url: img('mango-thai.jpg'), title: 'হিমসাগর / আম্রপালি', caption: 'দেশি ও বিদেশি আমের চারা', sortOrder: 2, active: true },
  { id: 'media_3', type: 'image', url: img('mango-palmer.jpg'), title: 'আমেরিকান পালমার', caption: 'রেড আইভরি ও লাল আম', sortOrder: 3, active: true },
  { id: 'media_4', type: 'image', url: img('coconut.jpg'), title: 'ভিয়েতনামি নারিকেল', caption: 'খাটো জাতের হাইব্রিড নারিকেল', sortOrder: 4, active: true },
  { id: 'media_5', type: 'image', url: img('hero-delivery.jpg'), title: 'বারোমাসি কাঁঠাল', caption: 'সারা বছর ফলনশীল চারা', sortOrder: 5, active: true },
  { id: 'media_6', type: 'image', url: img('mango-red.jpg'), title: 'রামবুটান ও বিদেশি ফল', caption: 'মিয়াজাকি, ডুরিয়ান, পার্সিমন', sortOrder: 6, active: true },
  {
    id: 'media_7',
    type: 'video',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    title: 'নার্সারি ট্যুর',
    caption: 'আমাদের বাগান ও চারা পরিচর্যার ভিডিও',
    sortOrder: 7,
    active: true,
  },
]

export const seedLanding: LandingContent = {
  heroTitle: 'পণ্য নয়, আস্থা বিনিময় করি',
  heroSubtitle: 'দেশি-বিদেশি ফল ও সবজির চারা · নাটোর সদর · ২০ হাজার ফলোয়ারের আস্থা',
  packageTitle: 'বৈশিষ্ট্য',
  packageItems: [
    'হাইব্রিড পেঁপে চারা (শতভাগ জাতের গ্যারান্টি)',
    'ভিয়েতনামি খাটো জাতের নারিকেল',
    'রামবুটান',
    'মিয়াজাকি ও লাল আম',
    'হিমসাগর ও আম্রপালি',
    'আমেরিকান পালমার / রেড আইভরি',
    'বারোমাসি কাঁঠাল',
    'বারোমাসি লাল জাম্বুরা',
    'লিচু · লটকন · পার্সিমন',
    'ভিয়েতনাম হাইব্রিড সুপারি',
    'ডুরিয়ানসহ আরও বিদেশি ফলের চারা',
  ],
  storyTitle: '১০০% হাইব্রিড জাতের পেঁপে চারা খুঁজছেন?',
  storyBody:
    'তাহলে দেরি না করে আজই যোগাযোগ করুন। আমাদের প্রতিটি চারায় রয়েছে শতভাগ জাতের গ্যারান্টি। সিজনের সেরা ও স্বাস্থ্যকর চারা সারা দেশে কুরিয়ার ও বাস সার্ভিসে ডেলিভারি দেওয়া হয়।',
  whyTitle: 'কেন JS Agro Shop?',
  whyItems: [
    'পণ্য নয় — আস্থা বিনিময় করি।',
    'প্রতিটি চারায় শতভাগ জাতের গ্যারান্টি।',
    'সারা বাংলাদেশে কুরিয়ার ও বাস সার্ভিসে ডেলিভারি।',
    'দেশি-বিদেশি ফল ও সবজির চারা এক জায়গায়।',
  ],
  paymentTitle: 'WhatsApp / Imo',
  paymentNumber: '01813-514791 · 01725-250188',
  paymentNote: 'অর্ডার কনফার্ম করতে WhatsApp বা Imo-তে মেসেজ দিন। সারা দেশে কুরিয়ার/বাস ডেলিভারি।',
  offerProductId: LANDING_OFFER_ID,
  offerTitle: 'মিয়াজাকি আম (সূর্য ডিম)',
  offerPrice: 850,
  offerComparePrice: null,
  offerMediaIds: [],
  metaPixelId: '',
  ctaLabel: 'অর্ডার করুন',
  checkoutTitle: 'আপনার নাম, ঠিকানা ও মোবাইল নম্বর দিয়ে অর্ডারটি সম্পন্ন করুন',
  helpTitle: 'ওয়েবসাইটে অর্ডার করতে সমস্যা হলে বা অর্ডার করতে না পারলে',
  helpSubtitle: 'প্রয়োজনে কল করুন-',
  checkoutBillingTitle: 'বিলিং তথ্য',
  checkoutOrderTitle: 'আপনার অর্ডার',
  checkoutSubmitLabel: 'অর্ডার করুন',
  checkoutCodNote: 'Cash on delivery — পণ্য হাতে পেয়ে টাকা দিবেন।',
}

function asLines(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return asLines(parsed, fallback)
    } catch {
      const lines = value.split('\n').map((item) => item.trim()).filter(Boolean)
      if (lines.length) return lines
    }
  }
  if (value == null) return fallback
  return []
}

function pickText(value: string | undefined | null, fallback: string, allowEmpty = false) {
  if (value == null) return fallback
  const trimmed = value.trim()
  return allowEmpty ? trimmed : trimmed || fallback
}

export function normalizeLanding(raw?: Partial<LandingContent> | null): LandingContent {
  const base = seedLanding
  const src = raw ?? {}
  return {
    heroTitle: pickText(src.heroTitle, base.heroTitle, true),
    heroSubtitle: pickText(src.heroSubtitle, base.heroSubtitle, true),
    packageTitle: pickText(src.packageTitle, base.packageTitle, true),
    packageItems: src.packageItems == null ? base.packageItems : asLines(src.packageItems, []),
    storyTitle: pickText(src.storyTitle, base.storyTitle, true),
    storyBody: pickText(src.storyBody, base.storyBody, true),
    whyTitle: pickText(src.whyTitle, base.whyTitle, true),
    whyItems: src.whyItems == null ? base.whyItems : asLines(src.whyItems, []),
    paymentTitle: pickText(src.paymentTitle, base.paymentTitle, true),
    paymentNumber: pickText(src.paymentNumber, base.paymentNumber, true),
    paymentNote: pickText(src.paymentNote, base.paymentNote, true),
    offerProductId: src.offerProductId?.trim() && src.offerProductId !== 'prod_papaya'
      ? src.offerProductId.trim()
      : LANDING_OFFER_ID,
    offerTitle: pickText(src.offerTitle, base.offerTitle, true),
    offerPrice: Number.isFinite(Number(src.offerPrice)) && Number(src.offerPrice) >= 0 ? Number(src.offerPrice) : 0,
    offerComparePrice:
      src.offerComparePrice == null || !Number.isFinite(Number(src.offerComparePrice))
        ? null
        : Number(src.offerComparePrice),
    offerMediaIds: Array.isArray(src.offerMediaIds)
      ? src.offerMediaIds.map((id) => String(id).trim()).filter(Boolean)
      : [],
    metaPixelId: src.metaPixelId?.trim() || '',
    ctaLabel: pickText(src.ctaLabel, base.ctaLabel, true),
    checkoutTitle: pickText(src.checkoutTitle, base.checkoutTitle, true),
    helpTitle: pickText(src.helpTitle, base.helpTitle),
    helpSubtitle: pickText(src.helpSubtitle, base.helpSubtitle),
    checkoutBillingTitle: pickText(src.checkoutBillingTitle, base.checkoutBillingTitle, true),
    checkoutOrderTitle: pickText(src.checkoutOrderTitle, base.checkoutOrderTitle, true),
    checkoutSubmitLabel: pickText(src.checkoutSubmitLabel, base.checkoutSubmitLabel),
    checkoutCodNote: pickText(src.checkoutCodNote, base.checkoutCodNote, true),
  }
}

const offer = seedProducts[0]

export const seedOrders: Order[] = [
  {
    id: 'ord_demo_1',
    items: [{ productId: offer.id, name: offer.name, image: offer.image, price: 1700, quantity: 1 }],
    customerName: 'করিম উদ্দিন',
    phone: '01711223344',
    address: 'হাউস ১২, রোড ৫, উত্তরা',
    district: 'Dhaka',
    shippingType: 'district',
    shippingFee: 250,
    subtotal: 1700,
    total: 1950,
    status: 'pending',
    notes: '',
    source: '',
    campaign: '',
    createdAt: '2026-08-13T09:20:00.000Z',
  },
  {
    id: 'ord_demo_2',
    items: [{ productId: 'prod_coconut', name: 'ভিয়েতনামি হাইব্রিড নারিকেল', image: img('coconut.jpg'), price: 550, quantity: 2 }],
    customerName: 'আয়েশা আক্তার',
    phone: '01899887766',
    address: 'নতুন বাজার, সদর',
    district: 'Chattogram',
    shippingType: 'upazila',
    shippingFee: 300,
    subtotal: 1100,
    total: 1400,
    status: 'confirmed',
    notes: '',
    source: '',
    campaign: '',
    createdAt: '2026-08-12T14:10:00.000Z',
  },
  {
    id: 'ord_demo_3',
    items: [{ productId: 'prod_surjodim', name: 'জাপানের সুর্যডিম আম', image: img('mango-yellow.jpg'), price: 850, quantity: 1 }],
    customerName: 'রহিম মিয়া',
    phone: '01655443322',
    address: 'কলেজ রোড, সদর',
    district: 'Rajshahi',
    shippingType: 'district',
    shippingFee: 250,
    subtotal: 850,
    total: 1100,
    status: 'shipped',
    notes: '',
    source: '',
    campaign: '',
    createdAt: '2026-08-11T11:00:00.000Z',
  },
  {
    id: 'ord_demo_4',
    items: [{ productId: 'prod_papaya', name: 'হাইব্রিড পেঁপে চারা', image: img('fruits.jpg'), price: 150, quantity: 3 }],
    customerName: 'ফাতেমা বেগম',
    phone: '01566778899',
    address: 'ওয়ার্ড ৩, পৌরসভা',
    district: 'Natore',
    shippingType: 'district',
    shippingFee: 250,
    subtotal: 450,
    total: 700,
    status: 'delivered',
    notes: '',
    source: '',
    campaign: '',
    createdAt: '2026-08-10T08:45:00.000Z',
  },
]

export const seedMessages: ContactMessage[] = [
  {
    id: 'msg_demo_1',
    name: 'নাসির হোসেন',
    phone: '01700001122',
    email: 'nasir@example.com',
    message: 'ঢাকার বাইরে ডেলিভারি কত দিনে পৌঁছায়?',
    read: false,
    createdAt: '2026-08-13T16:00:00.000Z',
  },
]

export function createSeedSnapshot(): StoreSnapshot {
  return {
    products: seedProducts,
    orders: seedOrders,
    slides: seedSlides,
    media: seedMedia,
    landing: seedLanding,
    site: seedSite,
    customers: [],
    messages: seedMessages,
  }
}
