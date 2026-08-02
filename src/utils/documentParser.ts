import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { PlanNode, NodeType, TableRowNode, TableCellNode, CellParagraphNode } from '../types';

// Configure pdfjs worker to reliable CDN
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export async function parseUploadedFileToNodes(file: File): Promise<PlanNode[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.docx')) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Configure mammoth to convert docx images to inline base64 images and retain formatting tags
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

    const lineMap: { [y: number]: { x: number; text: string }[] } = {};

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform;
        const x = transform[4];
        const y = Math.round(transform[5] / 4) * 4;

        if (!lineMap[y]) {
          lineMap[y] = [];
        }
        lineMap[y].push({ x, text: item.str });
      }
    }

    const sortedYs = Object.keys(lineMap)
      .map(Number)
      .sort((a, b) => b - a);

    for (const y of sortedYs) {
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
        contentVi: 'Nội dung file PDF dạng quét/scan. Thầy cô có thể gõ hoặc dán trực tiếp nội dung bài dạy tại đây.',
        contentEn: '',
        fontSize: 13,
      },
    ];
  }

  return parseRawTextToNodes(fullText);
}

function detectFormatting(el: Element): { isBold: boolean; isItalic: boolean; align?: 'left' | 'center' | 'right' | 'justify' } {
  const isBold =
    el.querySelector('strong, b') !== null ||
    el.tagName.toLowerCase() === 'strong' ||
    el.tagName.toLowerCase() === 'b' ||
    /font-weight\s*:\s*(bold|[6-9]00)/i.test(el.getAttribute('style') || '');

  const isItalic =
    el.querySelector('em, i') !== null ||
    el.tagName.toLowerCase() === 'em' ||
    el.tagName.toLowerCase() === 'i' ||
    /font-style\s*:\s*italic/i.test(el.getAttribute('style') || '');

  let align: 'left' | 'center' | 'right' | 'justify' | undefined;
  const style = el.getAttribute('style') || '';
  if (/text-align\s*:\s*center/i.test(style)) align = 'center';
  else if (/text-align\s*:\s*right/i.test(style)) align = 'right';
  else if (/text-align\s*:\s*justify/i.test(style)) align = 'justify';
  else if (/text-align\s*:\s*left/i.test(style)) align = 'left';

  return { isBold, isItalic, align };
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

    const fmt = detectFormatting(el);

    if (tagName === 'h1' || tagName === 'h2') {
      nodes.push({
        id: `pnode-${nodeCount++}`,
        type: tagName === 'h1' ? 'heading1' : 'heading2',
        contentVi: textContent,
        contentEn: '',
        imageData,
        fontSize: 13,
        isBold: fmt.isBold,
        isItalic: fmt.isItalic,
        align: fmt.align || 'justify',
      });
    } else if (tagName === 'h3' || tagName === 'h4') {
      nodes.push({
        id: `pnode-${nodeCount++}`,
        type: 'heading3',
        contentVi: textContent,
        contentEn: '',
        imageData,
        fontSize: 13,
        isBold: fmt.isBold,
        isItalic: fmt.isItalic,
        align: fmt.align || 'justify',
      });
    } else if (tagName === 'ul' || tagName === 'ol') {
      const lis = Array.from(el.querySelectorAll('li'));
      for (const li of lis) {
        const liImg = li.querySelector('img');
        const liFmt = detectFormatting(li);
        nodes.push({
          id: `pnode-${nodeCount++}`,
          type: 'bullet',
          contentVi: li.textContent?.trim() || '',
          contentEn: '',
          imageData: liImg ? liImg.getAttribute('src') || undefined : undefined,
          fontSize: 13,
          isBold: liFmt.isBold,
          isItalic: liFmt.isItalic,
          align: liFmt.align || 'justify',
        });
      }
    } else if (tagName === 'table') {
      const rows = Array.from(el.querySelectorAll('tr'));
      const tableRows: TableRowNode[] = [];
      let rowIdx = 1;

      for (const tr of rows) {
        const cells = Array.from(tr.querySelectorAll('th, td'));
        const cellNodes: TableCellNode[] = cells.map((cell, cIdx) => {
          const cellImg = cell.querySelector('img');
          const isHeaderCell = cell.tagName.toLowerCase() === 'th';
          const pElements = Array.from(cell.querySelectorAll('p, div'));

          let cellParagraphs: CellParagraphNode[] = [];

          if (pElements.length > 0) {
            cellParagraphs = pElements.map((p, pIdx) => {
              const text = p.textContent?.trim() || '';
              const pFmt = detectFormatting(p);
              return {
                id: `tcp-${nodeCount}-${rowIdx}-${cIdx}-${pIdx}`,
                contentVi: text,
                contentEn: '',
                isBold: isHeaderCell || pFmt.isBold,
                isItalic: pFmt.isItalic,
                align: pFmt.align || (isHeaderCell ? 'center' : 'justify'),
              };
            }).filter((p) => p.contentVi.length > 0);
          }

          if (cellParagraphs.length === 0) {
            const textLines = (cell.textContent || '').split('\n').map((s) => s.trim()).filter(Boolean);
            cellParagraphs = textLines.map((lineText, lIdx) => ({
              id: `tcp-${nodeCount}-${rowIdx}-${cIdx}-${lIdx}`,
              contentVi: lineText,
              contentEn: '',
              isBold: isHeaderCell || detectFormatting(cell).isBold,
              isItalic: detectFormatting(cell).isItalic,
              align: detectFormatting(cell).align || (isHeaderCell ? 'center' : 'justify'),
            }));
          }

          const fullContentVi = cellParagraphs.map((p) => p.contentVi).join('\n') || cell.textContent?.trim() || '';

          return {
            id: `tc-${nodeCount}-${rowIdx}-${cIdx}`,
            contentVi: fullContentVi,
            contentEn: '',
            isHeader: isHeaderCell,
            imageData: cellImg ? cellImg.getAttribute('src') || undefined : undefined,
            isBold: isHeaderCell || detectFormatting(cell).isBold,
            isItalic: detectFormatting(cell).isItalic,
            paragraphs: cellParagraphs,
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
        fontSize: 13,
        tableRows,
      });
    } else {
      nodes.push({
        id: `pnode-${nodeCount++}`,
        type: 'paragraph',
        contentVi: textContent,
        contentEn: '',
        imageData,
        fontSize: 13,
        isBold: fmt.isBold,
        isItalic: fmt.isItalic,
        align: fmt.align || 'justify',
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
    let type: NodeType = 'paragraph';
    let isBold = false;
    let fontSize = 13;

    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
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
      align: 'justify',
    });
  }

  return nodes;
}
