import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { PlanNode, NodeType, TableRowNode } from '../types';

// Configure pdfjs worker to reliable CDN
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export async function parseUploadedFileToNodes(file: File): Promise<PlanNode[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Configure mammoth to convert docx images to inline base64 images
      const result = await mammoth.convertToHtml({
        arrayBuffer,
        convertImage: mammoth.images.imgElement((image) => {
          return image.read('base64').then((imageBuffer) => ({
            src: `data:${image.contentType};base64,${imageBuffer}`,
          }));
        }),
      });
      const html = result.value;
      return parseHtmlToNodes(html);
    } catch (e) {
      console.warn('Mammoth docx parse failed, falling back to text reader', e);
      const text = await file.text();
      return parseRawTextToNodes(text);
    }
  } else if (fileName.endsWith('.pdf')) {
    try {
      return await parsePdfToNodes(file);
    } catch (e) {
      console.warn('PDF parsing failed, falling back to basic text extractor', e);
      return parseRawTextToNodes('KẾ HOẠCH BÀI DẠY (Tải từ PDF)\nNội dung bài dạy trích xuất từ file PDF.');
    }
  } else {
    // Plain TXT or other text formats
    const text = await file.text();
    return parseRawTextToNodes(text);
  }
}

async function parsePdfToNodes(file: File): Promise<PlanNode[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;

  const extractedLines: string[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    // Group text items by Y position to reconstruct paragraphs / table lines
    const lineMap: { [y: number]: { x: number; text: string }[] } = {};

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform;
        const x = transform[4];
        const y = Math.round(transform[5] / 4) * 4; // group items within 4px height

        if (!lineMap[y]) {
          lineMap[y] = [];
        }
        lineMap[y].push({ x, text: item.str });
      }
    }

    // Sort lines top to bottom (descending Y)
    const sortedYs = Object.keys(lineMap)
      .map(Number)
      .sort((a, b) => b - a);

    for (const y of sortedYs) {
      // Sort items left to right
      const sortedItems = lineMap[y].sort((a, b) => a.x - b.x);
      const lineStr = sortedItems.map((item) => item.text).join(' ').trim();
      if (lineStr) {
        extractedLines.push(lineStr);
      }
    }
  }

  const fullText = extractedLines.join('\n');
  if (!fullText.trim()) {
    return [
      {
        id: `pdf-empty-${Date.now()}`,
        type: 'heading1',
        contentVi: `KẾ HOẠCH BÀI DẠY (File PDF: ${file.name})`,
        contentEn: '',
        fontSize: 14,
        isBold: true,
      },
      {
        id: `pdf-empty-desc-${Date.now()}`,
        type: 'paragraph',
        contentVi: 'Nội dung file PDF không có lớp văn bản (PDF ảnh quét/scan). Thầy cô có thể gõ hoặc dán trực tiếp nội dung bài dạy vào đây.',
        contentEn: '',
        fontSize: 13,
      },
    ];
  }

  return parseRawTextToNodes(fullText);
}

function detectCV5512Header(text: string): { isHeader: boolean; type: NodeType; isBold: boolean; fontSize: number } {
  const upper = text.toUpperCase().trim();
  if (
    upper.startsWith('KẾ HOẠCH BÀI DẠY') ||
    upper.startsWith('GIÁO ÁN') ||
    upper.startsWith('BÀI HỌC:') ||
    upper.startsWith('TÊN BÀI DẠY:')
  ) {
    return { isHeader: true, type: 'title', isBold: true, fontSize: 16 };
  }

  if (
    /^(I|II|III|IV|V|VI|VII)\./.test(upper) ||
    upper.startsWith('MỤC TIÊU') ||
    upper.startsWith('THIẾT BỊ DẠY HỌC') ||
    upper.startsWith('TIẾN TRÌNH DẠY HỌC') ||
    upper.startsWith('HOẠT ĐỘNG')
  ) {
    return { isHeader: true, type: 'heading1', isBold: true, fontSize: 14 };
  }

  if (
    /^\d+\.\s*(Mục tiêu|Nội dung|Sản phẩm|Tổ chức thực hiện)/i.test(text) ||
    /^(a|b|c|d)\)\s*(Chuyển giao|Thực hiện|Báo cáo|Kết luận)/i.test(text) ||
    /^Bước\s*\d+/i.test(text)
  ) {
    return { isHeader: true, type: 'heading2', isBold: true, fontSize: 13 };
  }

  return { isHeader: false, type: 'paragraph', isBold: false, fontSize: 13 };
}

function parseHtmlToNodes(html: string): PlanNode[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const nodes: PlanNode[] = [];
  let nodeCount = 1;

  const elements = Array.from(doc.body.children);

  for (const el of elements) {
    const tagName = el.tagName.toLowerCase();
    const textContent = el.textContent?.trim() || '';
    const imgEl = el.querySelector('img');
    const imageData = imgEl ? imgEl.getAttribute('src') || undefined : undefined;

    if (!textContent && tagName !== 'table' && !imageData) continue;

    if (tagName === 'h1' || tagName === 'h2') {
      nodes.push({
        id: `pnode-${nodeCount++}`,
        type: tagName === 'h1' ? 'heading1' : 'heading2',
        contentVi: textContent,
        contentEn: '',
        imageData,
        fontSize: tagName === 'h1' ? 14 : 13,
        isBold: true,
      });
    } else if (tagName === 'h3' || tagName === 'h4') {
      nodes.push({
        id: `pnode-${nodeCount++}`,
        type: 'heading3',
        contentVi: textContent,
        contentEn: '',
        imageData,
        fontSize: 13,
        isBold: true,
      });
    } else if (tagName === 'ul' || tagName === 'ol') {
      const lis = Array.from(el.querySelectorAll('li'));
      for (const li of lis) {
        const liImg = li.querySelector('img');
        nodes.push({
          id: `pnode-${nodeCount++}`,
          type: 'bullet',
          contentVi: li.textContent?.trim() || '',
          contentEn: '',
          imageData: liImg ? liImg.getAttribute('src') || undefined : undefined,
          fontSize: 13,
        });
      }
    } else if (tagName === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      const tableRows: TableRowNode[] = [];
      let rowIdx = 1;

      for (const tr of rows) {
        const cells = Array.from(tr.querySelectorAll('th, td'));
        const cellNodes = cells.map((cell, cIdx) => {
          const cellImg = cell.querySelector('img');
          return {
            id: `tc-${nodeCount}-${rowIdx}-${cIdx}`,
            contentVi: cell.textContent?.trim() || '',
            contentEn: '',
            isHeader: cell.tagName.toLowerCase() === 'th' || rowIdx === 1,
            imageData: cellImg ? cellImg.getAttribute('src') || undefined : undefined,
          };
        });

        tableRows.push({
          id: `tr-${nodeCount}-${rowIdx++}`,
          cells: cellNodes,
        });
      }

      nodes.push({
        id: `pnode-${nodeCount++}`,
        type: 'table',
        contentVi: 'Bảng biểu Kế hoạch bài dạy',
        contentEn: 'Lesson plan table',
        fontSize: 12,
        tableRows,
      });
    } else {
      const headerInfo = detectCV5512Header(textContent);
      nodes.push({
        id: `pnode-${nodeCount++}`,
        type: headerInfo.isHeader ? headerInfo.type : 'paragraph',
        contentVi: textContent,
        contentEn: '',
        imageData,
        fontSize: headerInfo.fontSize,
        isBold: headerInfo.isBold,
      });
    }
  }

  if (nodes.length === 0) {
    return parseRawTextToNodes(doc.body.textContent || '');
  }

  return nodes;
}

function parseRawTextToNodes(text: string): PlanNode[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const nodes: PlanNode[] = [];
  let count = 1;

  for (const line of lines) {
    const headerInfo = detectCV5512Header(line);
    let type: NodeType = headerInfo.type;
    let isBold = headerInfo.isBold;
    let fontSize = headerInfo.fontSize;

    if (!headerInfo.isHeader && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
      type = 'bullet';
      fontSize = 13;
      isBold = false;
    }

    nodes.push({
      id: `node-raw-${count++}`,
      type,
      contentVi: line.replace(/^[•\-\*]\s*/, ''),
      contentEn: '',
      fontSize,
      isBold,
    });
  }

  return nodes;
}
