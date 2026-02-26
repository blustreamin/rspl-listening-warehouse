import { UploadedFile, CanonicalFieldMap, InputMapping, FileSourceTag } from '../types';

export const CANONICAL_FIELDS = [
  { key: 'text', label: 'Review / Mention Text', required: true },
  { key: 'title', label: 'Title / Subject', required: false },
  { key: 'rating', label: 'Rating (Stars)', required: false },
  { key: 'createdAtISO', label: 'Date / Time', required: false },
  { key: 'author', label: 'Author Name', required: false },
  { key: 'brand', label: 'Brand Name', required: false },
  { key: 'product', label: 'Product Title', required: false },
  { key: 'url', label: 'Source URL', required: false },
  { key: 'platform', label: 'Platform Source', required: false },
  { key: 'location', label: 'Country', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State / Region', required: false },
  { key: 'language', label: 'Language', required: false },
];

/**
 * SOURCE_HEURISTICS: Maps canonical field names to likely column names.
 * 
 * ⚠️  ORDERING MATTERS: The matching engine tries exact match first, then substring.
 *    Put the MOST SPECIFIC column name first to avoid false positives.
 *    e.g., 'Post Snippet' should match on 'postsnippet' not 'mentionurl'.
 *    e.g., 'reviewDescription' should match before 'reviewTitle'.
 */
const SOURCE_HEURISTICS: Record<string, Record<keyof CanonicalFieldMap, string[]>> = {
  amazon: {
    // ⚠️ 'reviewDescription' must come BEFORE 'review' to avoid matching 'reviewTitle' first
    text: ['reviewDescription', 'reviewText', 'review_description', 'text', 'content', 'review', 'body'],
    title: ['reviewTitle', 'title', 'headline', 'summary'],
    rating: ['ratingScore', 'rating', 'stars', 'reviewRating', 'star_rating'],
    createdAtISO: ['date', 'reviewDate', 'publishedAt', 'timestamp', 'date_posted'],
    author: ['reviewerName', 'author', 'userName', 'name'],
    brand: ['brand', 'manufacturer'],
    product: ['productTitle', 'productName', 'titleProduct', 'asin_name'],
    url: ['reviewUrl', 'url', 'productUrl'],
    platform: [],
    location: ['country', 'marketplace'],
    city: [],
    state: [],
    language: [],
    variant: ['variant', 'style', 'color', 'size'],
    sku: ['asin', 'productAsin', 'sku'],
    price: ['price', 'amount']
  },
  amazon_apify: {
    // Apify Amazon scraper uses: productAsin, ratingScore, reviewTitle, reviewDescription, date, country, variant, isVerified, position, reviewUrl
    text: ['reviewDescription', 'review_description'],
    title: ['reviewTitle', 'review_title'],
    rating: ['ratingScore', 'rating_score', 'rating'],
    createdAtISO: ['date', 'timestamp'],
    author: ['author', 'reviewerName'],
    brand: ['brand'],
    product: ['productTitle', 'productName'],
    url: ['reviewUrl', 'review_url', 'url'],
    platform: ['platform'],
    location: ['country'],
    city: [],
    state: [],
    language: [],
    variant: ['variant'],
    sku: ['productAsin', 'asin'],
    price: ['price']
  },
  flipkart: {
    text: ['reviewText', 'text', 'content', 'comment', 'review'],
    title: ['reviewTitle', 'title', 'summary', 'heading'],
    rating: ['rating', 'stars', 'rate'],
    createdAtISO: ['reviewDate', 'date', 'createdAt', 'added'],
    author: ['author', 'reviewerName', 'userName', 'customer_name'],
    brand: ['brand'],
    product: ['productName', 'productTitle', 'titleProduct'],
    url: ['reviewUrl', 'productUrl', 'url'],
    platform: [],
    location: ['city', 'state', 'location'],
    city: ['city'],
    state: ['state'],
    language: [],
    variant: [],
    sku: ['pid', 'sku'],
    price: ['price', 'selling_price']
  },
  flipkart_apify: {
    text: ['review_text', 'text', 'content'],
    title: ['title', 'heading'],
    rating: ['rating', 'stars'],
    createdAtISO: ['date', 'createdAt'],
    author: ['author', 'reviewer'],
    brand: ['brand'],
    product: ['product_name', 'productName'],
    url: ['url', 'reviewUrl'],
    platform: ['platform'],
    location: ['location'],
    city: [],
    state: [],
    language: [],
    variant: [],
    sku: [],
    price: ['price']
  },
  facebook_apify: {
    text: ['text', 'content', 'message', 'post'],
    title: [],
    rating: [],
    createdAtISO: ['date', 'timestamp'],
    author: ['author', 'page_name'],
    brand: ['brand'],
    product: [],
    url: ['url', 'permalink'],
    platform: ['platform'],
    location: ['location'],
    city: [],
    state: [],
    language: [],
    variant: [],
    sku: [],
    price: []
  },
  instagram_apify: {
    text: ['text', 'caption', 'content'],
    title: [],
    rating: [],
    createdAtISO: ['date', 'timestamp'],
    author: ['author', 'ownerUsername'],
    brand: ['brand'],
    product: [],
    url: ['url', 'permalink'],
    platform: ['platform'],
    location: ['location', 'locationName'],
    city: [],
    state: [],
    language: [],
    variant: [],
    sku: [],
    price: []
  },
  awario: {
    // ⚠️  'Post Snippet' is the text column. Use exact name FIRST.
    //     Previously 'mention' was matching 'Mention URL' before 'snippet' matched 'Post Snippet' — FIXED.
    text: ['Post Snippet', 'postsnippet', 'snippet', 'post_text', 'text', 'content'],
    title: ['title', 'post_title'],
    rating: [],
    createdAtISO: ['Mention Date', 'mentiondate', 'date', 'published', 'created_at'],
    author: ['Author Name', 'authorname', 'author', 'username', 'source_name', 'screen_name'],
    brand: ['brand_name', 'keyword'],
    product: [],
    url: ['Mention URL', 'mentionurl', 'url', 'link', 'permalink', 'original_url'],
    platform: ['Source', 'source', 'network', 'source_type'],
    location: ['Country', 'country', 'location', 'place'],
    city: ['City', 'city'],
    state: ['State', 'state'],
    language: ['Language', 'language', 'lang'],
    variant: [],
    sku: [],
    price: []
  },
  other: {
    text: ['review', 'body', 'content', 'text', 'comment', 'description', 'snippet', 'message'],
    title: ['title', 'subject', 'headline', 'summary'],
    rating: ['rating', 'stars', 'score', 'grade'],
    createdAtISO: ['date', 'time', 'posted', 'created'],
    author: ['author', 'user', 'reviewer', 'handle'],
    brand: ['brand', 'manufacturer', 'make'],
    product: ['product', 'item', 'variant', 'sku'],
    url: ['url', 'link', 'permalink', 'href'],
    platform: ['platform', 'source', 'network', 'origin'],
    location: ['location', 'country', 'geo'],
    city: ['city'],
    state: ['state', 'region'],
    language: ['language', 'lang'],
    variant: [],
    sku: [],
    price: []
  }
};

export const generateAutoMapping = (file: UploadedFile): InputMapping => {
  const columns = file.parsedPreview?.columns || [];
  const map: CanonicalFieldMap = {};
  const heuristics = SOURCE_HEURISTICS[file.sourceTag] || SOURCE_HEURISTICS.other;
  
  const lowerCols = columns.map(c => c.toLowerCase().trim().replace(/_/g, '').replace(/\s/g, ''));

  const findCol = (targetField: keyof CanonicalFieldMap): string | undefined => {
    const keywords = heuristics[targetField] || [];
    // 1. Exact match (case insensitive, normalized)
    for (const k of keywords) {
        const cleanK = k.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        const idx = lowerCols.indexOf(cleanK);
        if (idx !== -1) return columns[idx];
    }
    // 2. Contains match — only for longer keywords (≥4 chars) to avoid false positives
    for (const k of keywords) {
        const cleanK = k.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        if (cleanK.length < 4) continue;
        const idx = lowerCols.findIndex(c => c.includes(cleanK));
        if (idx !== -1) return columns[idx];
    }
    // 3. Relaxed contains for short keywords (last resort)
    for (const k of keywords) {
        const cleanK = k.toLowerCase().replace(/_/g, '').replace(/\s/g, '');
        if (cleanK.length >= 4) continue;
        const idx = lowerCols.findIndex(c => c.includes(cleanK));
        if (idx !== -1) return columns[idx];
    }
    return undefined;
  };

  // Auto-map all fields defined in heuristics
  (Object.keys(heuristics) as Array<keyof CanonicalFieldMap>).forEach(key => {
      map[key] = findCol(key);
  });

  // Default constants based on source
  const constants: any = {
      country: 'IN',
      currency: 'INR'
  };
  
  if (file.sourceTag === 'amazon' || file.sourceTag === 'amazon_apify') constants.platform = 'Amazon';
  if (file.sourceTag === 'flipkart') constants.platform = 'Flipkart';
  if (file.sourceTag === 'flipkart_apify') constants.platform = 'Flipkart';
  if (file.sourceTag === 'facebook_apify') constants.platform = 'Facebook';
  if (file.sourceTag === 'instagram_apify') constants.platform = 'Instagram';

  const mapping: InputMapping = {
    fileId: file.id,
    sourceTag: file.sourceTag,
    fieldMap: map,
    constants,
    status: map.text ? 'ready' : 'blocked',
    coverage: calculateCoverage(file, map)
  };

  console.log(`[mappingService] ${file.sourceTag}: text→${map.text}, url→${map.url}, city→${map.city}, state→${map.state}, location→${map.location}`);

  return mapping;
};

const calculateCoverage = (file: UploadedFile, map: CanonicalFieldMap): { text: number, rating: number, date: number } => {
  if (!file.rawContent || file.rawContent.length === 0) return { text: 0, rating: 0, date: 0 };
  
  const sample = file.rawContent.slice(0, 100);
  const isArray = Array.isArray(sample[0]);
  const headers = file.parsedPreview?.columns || [];

  const getVal = (row: any, colName?: string) => {
    if (!colName) return null;
    if (isArray) {
      const idx = headers.indexOf(colName);
      return idx !== -1 ? row[idx] : null;
    } else {
      return row[colName];
    }
  };

  const countNonNull = (colName?: string) => {
    if (!colName) return 0;
    return sample.filter(r => {
        const val = getVal(r, colName);
        return val !== null && val !== undefined && val !== '';
    }).length;
  };

  const total = sample.length;

  return {
    text: countNonNull(map.text) / total,
    rating: countNonNull(map.rating) / total,
    date: countNonNull(map.createdAtISO) / total,
  };
};

export const getPreviewRows = (file: UploadedFile, mapping: InputMapping, count: number = 5): any[] => {
  const sample = file.rawContent.slice(0, count);
  const isArray = Array.isArray(sample[0]);
  const headers = file.parsedPreview?.columns || [];

  return sample.map((row, i) => {
    const mapped: any = { _rowId: i };
    
    Object.entries(mapping.fieldMap).forEach(([canonical, colName]) => {
      if (colName) {
        if (isArray) {
           const idx = headers.indexOf(colName as string);
           mapped[canonical] = idx !== -1 ? row[idx] : null;
        } else {
           mapped[canonical] = row[colName as string];
        }
      }
    });

    if (!mapped.platform && mapping.constants.platform) mapped.platform = mapping.constants.platform;
    if (!mapped.location && mapping.constants.country) mapped.location = mapping.constants.country;
    
    return mapped;
  });
};
