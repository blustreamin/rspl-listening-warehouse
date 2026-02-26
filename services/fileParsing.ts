import * as XLSX from 'xlsx';
import { UploadedFile, FileSourceTag } from '../types';

/**
 * Auto-detect source tag from file name and column headers.
 * Apify exports have very distinctive naming patterns.
 */
const detectSourceTag = (fileName: string, headers: string[]): FileSourceTag => {
  const fn = fileName.toLowerCase();
  const headersLower = headers.map(h => h.toLowerCase());

  // Apify Amazon Reviews Scraper
  if (fn.includes('amazon-reviews-scraper') || fn.includes('amazon_reviews')) {
    return 'amazon_apify';
  }

  // Apify Facebook Posts Scraper
  if (fn.includes('facebook-posts-scraper') || fn.includes('facebook_posts')) {
    return 'facebook_apify';
  }

  // Apify Flipkart Reviews Scraper  
  if (fn.includes('flipkart-reviews-scraper') || fn.includes('flipkart_reviews')) {
    return 'flipkart_apify';
  }

  // Apify Instagram Scraper
  if (fn.includes('instagram-scraper') || fn.includes('instagram_scraper')) {
    return 'instagram_apify';
  }

  // Header-based detection as fallback
  if (headersLower.includes('review_text') && headersLower.includes('verified_purchase')) {
    return 'flipkart_apify';
  }
  // Amazon Apify: has reviewDescription + ratingScore (unique combo)
  if (headersLower.includes('reviewdescription') && headersLower.includes('ratingscore')) {
    return 'amazon_apify';
  }
  if (headersLower.includes('caption') && headersLower.includes('ownerusername') && headersLower.includes('likescount')) {
    return 'instagram_apify';
  }
  // Facebook Apify: massive column count with url, text, likes, comments, shares at the end
  if (headers.length > 500 && headersLower.includes('text') && headersLower.includes('likes') && headersLower.includes('shares')) {
    return 'facebook_apify';
  }

  // Existing detections
  if (headersLower.includes('post snippet') || headersLower.includes('mention url')) return 'awario';
  if (headersLower.includes('reviewtext') || headersLower.includes('reviewtitle')) return 'amazon';
  if (headersLower.includes('review description') || headersLower.includes('rating score')) return 'amazon';
  
  return 'other';
};

/**
 * For Apify formats with 900+ flattened columns, we only keep the useful ones.
 * This prevents memory explosion and makes downstream processing fast.
 */
const INSTAGRAM_KEEP_COLS = new Set([
  'caption', 'url', 'timestamp', 'likesCount', 'commentsCount',
  'ownerUsername', 'ownerFullName', 'locationName', 'locationId',
  'firstComment', 'type', 'id', 'shortCode', 'inputUrl',
  // Hashtags (first 10)
  ...Array.from({ length: 10 }, (_, i) => `hashtags/${i}`),
  // Latest comments text (up to 10)
  ...Array.from({ length: 10 }, (_, i) => `latestComments/${i}/text`),
  ...Array.from({ length: 10 }, (_, i) => `latestComments/${i}/ownerUsername`),
  ...Array.from({ length: 10 }, (_, i) => `latestComments/${i}/timestamp`),
  ...Array.from({ length: 10 }, (_, i) => `latestComments/${i}/likesCount`),
]);

const FACEBOOK_KEEP_COLS = new Set(['url', 'text', 'likes', 'comments', 'shares']);

/**
 * Explode Instagram rows into multiple evidence rows:
 * - 1 row for the post caption
 * - 1 row per comment (latestComments/N/text + firstComment)
 * This gives us rich consumer voice data beyond just brand captions.
 */
const explodeInstagramRows = (rows: Record<string, any>[]): Record<string, any>[] => {
  const exploded: Record<string, any>[] = [];

  for (const row of rows) {
    const caption = row['caption'] || '';
    const postUrl = row['url'] || '';
    const timestamp = row['timestamp'] || '';
    const ownerUsername = row['ownerUsername'] || '';
    const locationName = row['locationName'] || '';
    const likesCount = row['likesCount'] || 0;

    // Collect hashtags
    const hashtags: string[] = [];
    for (let i = 0; i < 10; i++) {
      const tag = row[`hashtags/${i}`];
      if (tag && String(tag).trim()) hashtags.push(String(tag).trim());
    }
    const hashtagStr = hashtags.join(', ');

    // Row 1: The caption itself (brand post or user post)
    if (caption && String(caption).trim().length > 10) {
      exploded.push({
        text: String(caption).trim(),
        url: postUrl,
        date: timestamp,
        author: ownerUsername,
        location: locationName,
        platform: 'Instagram',
        engagement: likesCount,
        hashtags: hashtagStr,
        record_type: 'caption',
        _sourceFile: 'instagram_apify'
      });
    }

    // Row 2: firstComment
    const fc = row['firstComment'];
    if (fc && String(fc).trim().length > 5) {
      exploded.push({
        text: String(fc).trim(),
        url: postUrl,
        date: timestamp,
        author: 'comment_user',
        location: locationName,
        platform: 'Instagram',
        engagement: 0,
        hashtags: hashtagStr,
        record_type: 'comment',
        _sourceFile: 'instagram_apify'
      });
    }

    // Rows 3+: latestComments
    for (let i = 0; i < 10; i++) {
      const commentText = row[`latestComments/${i}/text`];
      const commentUser = row[`latestComments/${i}/ownerUsername`] || 'comment_user';
      if (commentText && String(commentText).trim().length > 5) {
        exploded.push({
          text: String(commentText).trim(),
          url: postUrl,
          date: row[`latestComments/${i}/timestamp`] || timestamp,
          author: String(commentUser),
          location: locationName,
          platform: 'Instagram',
          engagement: row[`latestComments/${i}/likesCount`] || 0,
          hashtags: hashtagStr,
          record_type: 'comment',
          _sourceFile: 'instagram_apify'
        });
      }
    }
  }

  return exploded;
};

export const parseFile = async (file: File, sourceTag: FileSourceTag = 'other'): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // First pass: get headers to detect source
        const headerRow = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 }) as any[][];
        if (!headerRow || headerRow.length === 0) {
          reject(new Error("File appears empty"));
          return;
        }
        
        const allHeaders = (headerRow[0] || []).map(String);
        const detectedTag = sourceTag !== 'other' ? sourceTag : detectSourceTag(file.name, allHeaders);
        
        console.log(`[fileParsing] ${file.name}: detected=${detectedTag}, cols=${allHeaders.length}`);
        
        let finalHeaders: string[];
        let finalRows: any[];
        let rowCount: number;
        
        if (detectedTag === 'instagram_apify') {
          // Parse as objects, filter to keep columns only
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
          rowCount = jsonData.length;
          
          // Filter to only keep useful columns
          const filteredRows = jsonData.map(row => {
            const filtered: Record<string, any> = {};
            for (const key of Object.keys(row)) {
              if (INSTAGRAM_KEEP_COLS.has(key)) filtered[key] = row[key];
            }
            return filtered;
          });
          
          // Explode into caption + comment rows
          const exploded = explodeInstagramRows(filteredRows);
          finalHeaders = ['text', 'url', 'date', 'author', 'location', 'platform', 'engagement', 'hashtags', 'record_type', '_sourceFile'];
          finalRows = exploded;
          rowCount = exploded.length;
          
          console.log(`[fileParsing] Instagram: ${jsonData.length} posts -> ${exploded.length} exploded rows (captions + comments)`);
          
        } else if (detectedTag === 'facebook_apify') {
          // Only parse the last 5 useful columns from 923-column XLSX
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
          rowCount = jsonData.length;
          
          finalRows = jsonData.map(row => {
            const filtered: Record<string, any> = {};
            for (const key of Object.keys(row)) {
              if (FACEBOOK_KEEP_COLS.has(key)) filtered[key] = row[key];
            }
            filtered['platform'] = 'Facebook';
            filtered['_sourceFile'] = 'facebook_apify';
            return filtered;
          });
          finalHeaders = ['url', 'text', 'likes', 'comments', 'shares', 'platform', '_sourceFile'];
          
          console.log(`[fileParsing] Facebook: ${jsonData.length} posts, ${finalRows.filter(r => r.text && String(r.text).length > 10).length} with text`);
          
        } else if (detectedTag === 'flipkart_apify') {
          // Clean 8-column format - parse as objects directly
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
          rowCount = jsonData.length;
          
          finalRows = jsonData.map(row => ({
            ...row,
            platform: 'Flipkart',
            _sourceFile: 'flipkart_apify'
          }));
          finalHeaders = ['product_name', 'rating', 'title', 'review_text', 'author', 'date', 'verified_purchase', 'url', 'platform', '_sourceFile'];
          
          console.log(`[fileParsing] Flipkart Apify: ${jsonData.length} reviews`);
          
        } else {
          // Original parsing path (Awario, Amazon, etc.)
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (!jsonData || jsonData.length === 0) {
            reject(new Error("File appears empty"));
            return;
          }
          
          finalHeaders = allHeaders;
          finalRows = jsonData;
          rowCount = jsonData.length;
        }

        const uploadedFile: UploadedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          type: file.type || 'application/octet-stream',
          sourceTag: detectedTag,
          uploadedAt: new Date().toISOString(),
          parsedPreview: {
            columns: finalHeaders,
            rowCount: rowCount
          },
          rawContent: finalRows
        };

        resolve(uploadedFile);

      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const formatBundleForIngestion = (files: UploadedFile[], manualText: string): string => {
  let combinedInput = "";

  if (manualText.trim()) {
    combinedInput += `--- SOURCE: MANUAL_INPUT (TEXT/CSV) ---\n${manualText}\n\n`;
  }

  files.forEach(file => {
    combinedInput += `--- SOURCE: ${file.name} (TAG: ${file.sourceTag.toUpperCase()}) ---\n`;
    
    const limit = 1000;
    const content = file.rawContent.slice(0, limit);
    
    if (Array.isArray(content[0])) {
      content.forEach(row => {
        combinedInput += (row as any[]).join(",") + "\n";
      });
    } else {
      combinedInput += JSON.stringify(content, null, 2);
    }
    
    if (file.rawContent.length > limit) {
      combinedInput += `\n... (Truncated ${file.rawContent.length - limit} more rows) ...\n`;
    }
    combinedInput += "\n\n";
  });

  return combinedInput;
};
