import * as XLSX from 'xlsx';
import { UploadedFile, FileSourceTag } from '../types';

export const parseFile = async (file: File, sourceTag: FileSourceTag = 'other'): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Assume first sheet is the target for now
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!jsonData || jsonData.length === 0) {
            reject(new Error("File appears empty"));
            return;
        }

        const headers = (jsonData[0] as any[]).map(String);
        // Remove header row from content
        const rows = jsonData.slice(1);

        const uploadedFile: UploadedFile = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            type: file.type || 'application/octet-stream',
            sourceTag: sourceTag,
            uploadedAt: new Date().toISOString(),
            parsedPreview: {
                columns: headers,
                rowCount: rows.length
            },
            rawContent: jsonData // Store raw array of arrays or objects
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

  // 1. Process Manual Text
  if (manualText.trim()) {
      combinedInput += `--- SOURCE: MANUAL_INPUT (TEXT/CSV) ---\n${manualText}\n\n`;
  }

  // 2. Process Files
  files.forEach(file => {
      combinedInput += `--- SOURCE: ${file.name} (TAG: ${file.sourceTag.toUpperCase()}) ---\n`;
      
      // Convert content back to CSV-like structure for the LLM
      // We limit to first 1000 rows per file to avoid context explosion in this demo
      const limit = 1000;
      const content = file.rawContent.slice(0, limit);
      
      if (Array.isArray(content[0])) {
          // It's an array of arrays (from sheet_to_json header:1)
          content.forEach(row => {
              combinedInput += (row as any[]).join(",") + "\n";
          });
      } else {
          // It's an array of objects
          combinedInput += JSON.stringify(content, null, 2);
      }
      
      if (file.rawContent.length > limit) {
          combinedInput += `\n... (Truncated ${file.rawContent.length - limit} more rows) ...\n`;
      }
      combinedInput += "\n\n";
  });

  return combinedInput;
};