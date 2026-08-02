import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { LessonPlanDocument, PlanNode } from '../types';

const DEFAULT_FONT_SIZE = 26; // 13pt in half-points
const BLUE_COLOR = '003399'; // Standard MOET blue for English translation

/**
 * Remove invalid ASCII control characters (\x00-\x1F except \x09,\x0A,\x0D) that break MS Word XML parsing.
 */
function cleanTextForXml(text: string): string {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}

/**
 * Convert Base64 data URL to Uint8Array for image embedding in Word docx
 */
function base64ToUint8Array(base64String: string): Uint8Array | null {
  try {
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error('Failed to convert base64 image:', e);
    return null;
  }
}

/**
 * Extract image extension for docx ImageRun type
 */
function getImageType(dataUrl?: string): 'png' | 'jpeg' | 'gif' | 'bmp' {
  if (!dataUrl) return 'png';
  if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg')) return 'jpeg';
  if (dataUrl.includes('image/gif')) return 'gif';
  if (dataUrl.includes('image/bmp')) return 'bmp';
  return 'png';
}

export async function exportLessonPlanToDocx(docData: LessonPlanDocument) {
  const childrenElements: (Paragraph | Table)[] = [];

  for (const node of docData.nodes) {
    // ================================================================
    // TABLE NODES — Preserving 100% original table structure & cell paragraphs
    // ================================================================
    if (node.type === 'table' && node.tableRows && node.tableRows.length > 0) {
      const docxRows = node.tableRows.map((row) => {
        const isTwoColumns = row.cells.length === 2;

        const docxCells = row.cells.map((cell, cellIdx) => {
          const cellParagraphs: Paragraph[] = [];

          // Image embedded inside table cell
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

          // Paragraph-by-paragraph rendering inside table cell
          const parasToRender = (cell.paragraphs && cell.paragraphs.length > 0)
            ? cell.paragraphs
            : (cell.contentVi || '').split('\n').map((line, lIdx) => ({
                id: `cell-line-${lIdx}`,
                contentVi: line,
                contentEn: (cell.contentEn || '').split('\n')[lIdx] || (lIdx === 0 ? cell.contentEn : ''),
                isBold: cell.isBold || cell.isHeader || false,
                isItalic: cell.isItalic || false,
                align: cell.isHeader ? ('center' as const) : ('justify' as const),
              }));

          for (const p of parasToRender) {
            const cleanVi = cleanTextForXml(p.contentVi || '');
            const cleanEn = cleanTextForXml(p.contentEn || '');

            if (!cleanVi && !cleanEn) continue;

            let pAlign = AlignmentType.JUSTIFIED;
            if (p.align === 'center' || cell.isHeader) pAlign = AlignmentType.CENTER;
            else if (p.align === 'right') pAlign = AlignmentType.RIGHT;
            else if (p.align === 'left') pAlign = AlignmentType.LEFT;

            // Vietnamese paragraph inside table cell
            if (cleanVi) {
              cellParagraphs.push(
                new Paragraph({
                  alignment: pAlign,
                  spacing: { before: 20, after: 10, line: 276 },
                  children: [
                    new TextRun({
                      text: cleanVi,
                      bold: p.isBold || false, // STRICTLY RESPECT ORIGINAL BOLDING!
                      italics: p.isItalic || false,
                      size: DEFAULT_FONT_SIZE,
                      font: 'Times New Roman',
                      color: '000000',
                    }),
                  ],
                })
              );
            }

            // English translation paragraph directly below Vietnamese paragraph
            if (cleanEn) {
              const cleanEnText = cleanEn
                .replace(/^\s*[\(\[\{]\s*/, '')
                .replace(/\s*[\)\]\}]\s*$/, '')
                .trim();

              if (cleanEnText) {
                cellParagraphs.push(
                  new Paragraph({
                    alignment: pAlign,
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

          // Cell width calculation
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
      childrenElements.push(new Paragraph({ spacing: { after: 40 } }));
      continue;
    }

    // ================================================================
    // TEXT NODES — Paragraph, Heading, Bullet, Title, etc.
    // ================================================================
    let align: any = AlignmentType.JUSTIFIED;
    if (node.align === 'center') align = AlignmentType.CENTER;
    else if (node.align === 'right') align = AlignmentType.RIGHT;
    else if (node.align === 'left') align = AlignmentType.LEFT;
    else align = AlignmentType.JUSTIFIED;

    const fontSizeHalf = (node.fontSize || 13) * 2;

    const cleanVi = cleanTextForXml(node.contentVi || '');
    const cleanEn = cleanTextForXml(node.contentEn || '');

    if (!cleanVi && !cleanEn && !node.imageData) continue;

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

    // Vietnamese paragraph (100% PRESERVING ORIGINAL BOLD/ITALIC/ALIGN)
    if (cleanVi) {
      childrenElements.push(
        new Paragraph({
          alignment: align,
          spacing: {
            before: 30,
            after: cleanEn ? 10 : 30,
            line: 276,
          },
          children: [
            new TextRun({
              text: viPrefix + cleanVi,
              bold: node.isBold || false, // ONLY BOLD IF ORIGINALLY BOLD!
              italics: node.isItalic || false,
              size: fontSizeHalf,
              font: 'Times New Roman',
              color: textColor,
            }),
          ],
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
            alignment: align,
            spacing: { before: 0, after: 40, line: 276 },
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
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: cleanTextForXml(docData.title || 'KẾ HOẠCH BÀI DẠY SONG NGỮ'),
            bold: true,
            size: 32,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2cm
              bottom: 1134, // 2cm
              left: 1701, // 3cm
              right: 1134, // 2cm
            },
          },
        },
        children: childrenElements,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeFilename = (docData.title || 'Giao_An_Song_Ngu')
    .replace(/[\\/:*?"<>|]/g, '_')
    .concat('_SongNgu.docx');

  saveAs(blob, safeFilename);
}
