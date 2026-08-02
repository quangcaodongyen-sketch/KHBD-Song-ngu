import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  VerticalAlign,
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { LessonPlanDocument, PlanNode } from '../types';

export const BLUE_COLOR = '003399'; // RGB(0, 51, 153) — Chuẩn màu xanh Bộ GD&ĐT

/**
 * Remove non-printable control characters that corrupt Word XML
 */
function cleanTextForXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    .replace(/\uFFFE|\uFFFF/g, '')
    .trim();
}

/**
 * Safely convert base64 data string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array | null {
  try {
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '').trim();
    if (!cleanBase64) return null;
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.warn('Invalid base64 image data:', e);
    return null;
  }
}

/**
 * Detect image mime type for ImageRun
 */
function getImageType(base64: string): 'png' | 'jpg' | 'gif' | 'bmp' {
  const lower = base64.toLowerCase();
  if (lower.includes('image/png')) return 'png';
  if (lower.includes('image/jpeg') || lower.includes('image/jpg')) return 'jpg';
  if (lower.includes('image/gif')) return 'gif';
  if (lower.includes('image/bmp')) return 'bmp';
  return 'png';
}

/**
 * Export bilingual lesson plan to Word (.docx) with professional formatting:
 * - Vietnamese: Bold/Normal black Times New Roman 13pt
 * - English: Italic blue (#003399) Times New Roman 13pt, on the line below
 * - Tables: Vi + En stacked in each cell, 55/45 column split
 * - Margins: Top 2cm, Bottom 2cm, Right 2cm, Left 3cm (binding)
 */
export async function exportLessonPlanToDocx(doc: LessonPlanDocument) {
  const childrenElements: any[] = [];
  const DEFAULT_FONT_SIZE = 26; // 13pt in half-points

  for (const node of doc.nodes) {
    // ================================================================
    // TABLE NODES — Each cell shows Vi text + En text stacked below
    // ================================================================
    if (node.type === 'table' && node.tableRows && node.tableRows.length > 0) {
      const docxRows = node.tableRows.map((row) => {
        const isTwoColumns = row.cells.length === 2;

        const docxCells = row.cells.map((cell, cellIdx) => {
          const cellParagraphs: Paragraph[] = [];

          // Embedded Cell Image
          if (cell.imageData && cell.imageData.startsWith('data:image')) {
            const imgBytes = base64ToUint8Array(cell.imageData);
            if (imgBytes) {
              try {
                cellParagraphs.push(
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 40, after: 40 },
                    children: [
                      new ImageRun({
                        data: imgBytes,
                        transformation: { width: 200, height: 140 },
                        type: getImageType(cell.imageData),
                      }),
                    ],
                  })
                );
              } catch (e) {
                console.warn('Image embedding error:', e);
              }
            }
          }

          // Vietnamese cell text paragraphs
          const rawViLines = cell.contentVi ? cell.contentVi.split('\n') : [''];
          const rawEnLines = cell.contentEn ? cell.contentEn.split('\n') : [];

          const viLines = rawViLines.map(cleanTextForXml).filter(Boolean);
          const enLines = rawEnLines.map(cleanTextForXml).filter(Boolean);

          const maxLines = Math.max(viLines.length, enLines.length, 1);
          for (let i = 0; i < maxLines; i++) {
            const viText = viLines[i] || (i === 0 && enLines.length === 0 ? '' : '');
            const enText = enLines[i] || '';

            if (viText) {
              const isViBold =
                cell.isHeader ||
                /^\s*(\*?\s*Bước\s*\d+|Nhiệm vụ\s*\d+|Hoạt động|Nội dung|Teacher|HS|GV|CÂU|Câu\s*\d+)/i.test(viText);

              cellParagraphs.push(
                new Paragraph({
                  spacing: { before: 20, after: 10, line: 276 },
                  children: [
                    new TextRun({
                      text: viText,
                      bold: isViBold,
                      size: DEFAULT_FONT_SIZE,
                      font: 'Times New Roman',
                      color: '000000',
                    }),
                  ],
                })
              );
            }

            if (enText) {
              const cleanEnText = enText
                .replace(/^\s*[\(\[\{]\s*/, '')
                .replace(/\s*[\)\]\}]\s*$/, '')
                .trim();

              if (cleanEnText) {
                cellParagraphs.push(
                  new Paragraph({
                    spacing: { before: 0, after: 30, line: 276 },
                    children: [
                      new TextRun({
                        text: cleanEnText,
                        italics: true,
                        bold: false,
                        size: DEFAULT_FONT_SIZE,
                        font: 'Times New Roman',
                        color: BLUE_COLOR,
                      }),
                    ],
                  })
                );
              }
            }
          }

          // Fallback empty paragraph if no text or image was added
          if (cellParagraphs.length === 0) {
            cellParagraphs.push(
              new Paragraph({
                children: [new TextRun({ text: '', size: DEFAULT_FONT_SIZE, font: 'Times New Roman' })],
              })
            );
          }

          // Compute cell width percentage
          let cellWidthPct = Math.floor(100 / Math.max(row.cells.length, 1));
          if (isTwoColumns) {
            cellWidthPct = cellIdx === 0 ? 55 : 45;
          }

          return new TableCell({
            children: cellParagraphs,
            verticalAlign: VerticalAlign.TOP,
            width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
            shading: cell.isHeader ? { fill: 'F0F4FA' } : undefined,
            margins: {
              top: 100,
              bottom: 100,
              left: 140,
              right: 140,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            },
          });
        });

        return new TableRow({ children: docxCells });
      });

      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: docxRows,
      });

      childrenElements.push(table);
      childrenElements.push(new Paragraph({ spacing: { after: 60 } }));
      continue;
    }

    // ================================================================
    // TEXT NODES — Heading, Paragraph, Bullet, Title, etc.
    // ================================================================
    let align: any = AlignmentType.LEFT;
    if (node.align === 'center') align = AlignmentType.CENTER;
    if (node.align === 'right') align = AlignmentType.RIGHT;
    if (node.align === 'justify') align = AlignmentType.JUSTIFIED;

    const fontSizeHalf = (node.fontSize || 13) * 2;

    const isHeaderNode =
      node.type === 'heading1' ||
      node.type === 'heading2' ||
      node.type === 'heading3' ||
      node.type === 'title';

    const cleanVi = cleanTextForXml(node.contentVi || '');
    const cleanEn = cleanTextForXml(node.contentEn || '');

    if (!cleanVi && !cleanEn && !node.imageData) continue;

    const isViLineBold =
      node.isBold ||
      isHeaderNode ||
      /^(I|II|III|IV|V|VI|VII|VIII|IX|X|\d+|[A-Z])[\.:\)]\s*/i.test(cleanVi);

    const isCenterTitle = node.type === 'title' || node.align === 'center';

    // Embedded Paragraph Image
    if (node.imageData && node.imageData.startsWith('data:image')) {
      const imgBytes = base64ToUint8Array(node.imageData);
      if (imgBytes) {
        try {
          childrenElements.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 60 },
              children: [
                new ImageRun({
                  data: imgBytes,
                  transformation: { width: 280, height: 180 },
                  type: getImageType(node.imageData),
                }),
              ],
            })
          );
        } catch (e) {
          console.warn('Paragraph image embedding error:', e);
        }
      }
    }

    const textColor = node.isIntegrated ? 'DC2626' : '000000';
    const viPrefix = node.type === 'bullet' ? '• ' : '';
    const viTextRuns: TextRun[] = [];

    const boldKeywordMatch = cleanVi.match(
      /^(\s*)(Năng lực[^:]+:|Phẩm chất[^:]*:|\d+\.\s*Về[^:]+:|\w\)\s*Mục tiêu:|\w\)\s*Nội dung:|\w\)\s*Sản phẩm:|\w\)\s*Tổ chức thực hiện:)/i
    );

    if (boldKeywordMatch && !isViLineBold) {
      const keyword = boldKeywordMatch[2];
      const rest = cleanVi.slice(boldKeywordMatch[0].length);
      viTextRuns.push(
        new TextRun({
          text: viPrefix + keyword,
          bold: true,
          italics: node.isItalic || false,
          size: fontSizeHalf,
          font: 'Times New Roman',
          color: textColor,
        })
      );
      if (rest) {
        viTextRuns.push(
          new TextRun({
            text: rest,
            bold: false,
            italics: node.isItalic || false,
            size: fontSizeHalf,
            font: 'Times New Roman',
            color: textColor,
          })
        );
      }
    } else {
      viTextRuns.push(
        new TextRun({
          text: viPrefix + cleanVi,
          bold: isViLineBold,
          italics: node.isItalic || false,
          size: fontSizeHalf,
          font: 'Times New Roman',
          color: textColor,
        })
      );
    }

    // Vietnamese paragraph
    if (cleanVi) {
      childrenElements.push(
        new Paragraph({
          alignment: isCenterTitle ? AlignmentType.CENTER : align,
          spacing: {
            before: isHeaderNode ? 100 : 30,
            after: cleanEn ? 10 : 30,
            line: 276,
          },
          children: viTextRuns,
        })
      );
    }

    // English translation paragraph (italic blue #003399)
    if (cleanEn) {
      const enPrefix = node.type === 'bullet' ? '  ' : '';
      const cleanEnText = cleanEn
        .replace(/^\s*[\(\[\{]\s*/, '')
        .replace(/\s*[\)\]\}]\s*$/, '')
        .trim();

      if (cleanEnText) {
        childrenElements.push(
          new Paragraph({
            alignment: isCenterTitle ? AlignmentType.CENTER : align,
            spacing: { before: 0, after: 50, line: 276 },
            children: [
              new TextRun({
                text: enPrefix + cleanEnText,
                italics: true,
                bold: false,
                size: fontSizeHalf,
                font: 'Times New Roman',
                color: BLUE_COLOR,
              }),
            ],
          })
        );
      }
    }
  }

  // Fallback if empty document
  if (childrenElements.length === 0) {
    childrenElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'KẾ HOẠCH BÀI DẠY SONG NGỮ',
            bold: true,
            size: DEFAULT_FONT_SIZE,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  // Create the Word Document
  const docxFile = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // ~2cm
              right: 1134, // ~2cm
              bottom: 1134, // ~2cm
              left: 1701, // ~3cm (left margin wider for binding)
            },
          },
        },
        children: childrenElements,
      },
    ],
  });

  // Pack and download
  const blob = await Packer.toBlob(docxFile);
  const rawTitle = doc.title || 'KHBD_SongNgu';
  const cleanTitle = rawTitle
    .replace(/[^a-zA-Z0-9_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ \-]/gi, '_')
    .replace(/_+/g, '_')
    .trim();

  saveAs(blob, `${cleanTitle}_SongNgu.docx`);
}
