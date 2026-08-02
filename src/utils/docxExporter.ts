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
    // TABLE NODES — Preserving 100% original table structure
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

          // Cell text paragraphs
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
                  alignment: cell.isHeader ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
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
                    alignment: cell.isHeader ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
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
      childrenElements.push(new Paragraph({ spacing: { after: 60 } }));
      continue;
    }

    // ================================================================
    // TEXT NODES — Heading, Paragraph, Bullet, Title, etc.
    // ================================================================
    let align: any = AlignmentType.JUSTIFIED; // Default to JUSTIFIED for all standard paragraphs!
    if (node.align === 'center') align = AlignmentType.CENTER;
    else if (node.align === 'right') align = AlignmentType.RIGHT;
    else if (node.align === 'left') align = AlignmentType.LEFT;
    else align = AlignmentType.JUSTIFIED;

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

    // Vietnamese paragraph (Căn đều 2 bên)
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

    // English translation paragraph (Căn đều 2 bên, màu xanh #003399, in nghiêng)
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
