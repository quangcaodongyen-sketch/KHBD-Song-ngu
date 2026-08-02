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
  Header,
  Footer,
  PageNumber,
  HeadingLevel,
  VerticalAlign,
  ImageRun,
} from 'docx';
import { saveAs } from 'file-saver';
import { LessonPlanDocument, PlanNode } from '../types';

export const BLUE_COLOR = '003399'; // RGB(0, 51, 153) — Chuẩn màu xanh Bộ GD&ĐT

function base64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Export bilingual lesson plan to Word (.docx) with professional formatting:
 * - Vietnamese: Bold/Normal black Times New Roman 13pt
 * - English: Italic blue (#003399) Times New Roman 13pt, on the line below
 * - Tables: Vi + En stacked in each cell, padding 100/150 dxa, 55/45 column split
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

          // Embedded Cell Image (e.g. blackboard picture, diagram)
          if (cell.imageData && cell.imageData.startsWith('data:image')) {
            try {
              cellParagraphs.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40, after: 40 },
                  children: [
                    new ImageRun({
                      data: base64ToUint8Array(cell.imageData),
                      transformation: { width: 220, height: 150 },
                    }),
                  ],
                })
              );
            } catch (e) {
              console.warn('Image embedding error:', e);
            }
          }

          // Vietnamese cell text paragraphs (split multi-line strings if needed)
          const viLines = cell.contentVi ? cell.contentVi.split('\n').filter((l) => l.trim().length > 0) : [''];
          const enLines = cell.contentEn ? cell.contentEn.split('\n').filter((l) => l.trim().length > 0) : [];

          // Format cell lines with stacked Vi -> En pairs
          const maxLines = Math.max(viLines.length, enLines.length, 1);
          for (let i = 0; i < maxLines; i++) {
            const viText = viLines[i] || '';
            const enText = enLines[i] || '';

            if (viText) {
              const isViBold = cell.isHeader || /^\s*(\*?\s*Bước\s*\d+|Nhiệm vụ\s*\d+|Hoạt động|Nội dung|Teacher|HS|GV|CÂU|Câu\s*\d+)/i.test(viText);
              cellParagraphs.push(
                new Paragraph({
                  spacing: { before: 30, after: 10, line: 276 },
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
              const cleanEnText = enText.replace(/^\s*[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]\s*$/, '').trim();
              if (cleanEnText) {
                cellParagraphs.push(
                  new Paragraph({
                    spacing: { before: 0, after: 40, line: 276 },
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

          // Compute cell width percentage (55% / 45% for 2-column activity table, equal for others)
          let cellWidthPct = Math.floor(100 / row.cells.length);
          if (isTwoColumns) {
            cellWidthPct = cellIdx === 0 ? 55 : 45;
          }

          return new TableCell({
            children: cellParagraphs.length > 0 ? cellParagraphs : [new Paragraph({ children: [new TextRun({ text: '', size: DEFAULT_FONT_SIZE })] })],
            verticalAlign: VerticalAlign.TOP,
            width: { size: cellWidthPct, type: WidthType.PERCENTAGE },
            shading: cell.isHeader ? { fill: 'F0F4FA' } : undefined,
            margins: {
              top: 100,    // ~6pt padding top
              bottom: 100, // ~6pt padding bottom
              left: 150,   // ~9pt padding left
              right: 150,  // ~9pt padding right
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
      // Small spacing after table
      childrenElements.push(new Paragraph({ spacing: { after: 80 } }));
      continue;
    }

    // ================================================================
    // TEXT NODES — Heading, Paragraph, Bullet, Title, etc.
    // Format: Vietnamese line → English line below (italic blue)
    // ================================================================
    let align: any = AlignmentType.LEFT;
    if (node.align === 'center') align = AlignmentType.CENTER;
    if (node.align === 'right') align = AlignmentType.RIGHT;
    if (node.align === 'justify') align = AlignmentType.JUSTIFIED;

    const fontSizeHalf = (node.fontSize || 13) * 2; // docx size in half-points

    const isHeaderNode =
      node.type === 'heading1' ||
      node.type === 'heading2' ||
      node.type === 'heading3' ||
      node.type === 'title';

    // Detect bold-worthy lines: headings + lines starting with section markers
    const isViLineBold =
      node.isBold ||
      isHeaderNode ||
      /^(I|II|III|IV|V|VI|VII|VIII|IX|X|\d+|[A-Z])[\.:\)]\s*/i.test(node.contentVi.trim());

    // Detect title/center lines (e.g. "BÀI 2: XỬ LÝ THÔNG TIN")
    const isCenterTitle =
      node.type === 'title' ||
      (node.align === 'center');

    // Embedded Paragraph Image
    if (node.imageData && node.imageData.startsWith('data:image')) {
      try {
        childrenElements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              new ImageRun({
                data: base64ToUint8Array(node.imageData),
                transformation: { width: 300, height: 190 },
              }),
            ],
          })
        );
      } catch (e) {
        console.warn('Paragraph image embedding error:', e);
      }
    }

    // Determine text color: RED (DC2626) if integrated, else BLACK (000000)
    const textColor = node.isIntegrated ? 'DC2626' : '000000';

    // Build Vietnamese text runs (may have inline bold segments)
    const viPrefix = node.type === 'bullet' ? '• ' : '';
    const viTextRuns: TextRun[] = [];

    // Check for bold keyword pattern like "Năng lực tự chủ, tự học:" or "1. Về kiến thức:"
    const boldKeywordMatch = node.contentVi.match(/^(\s*)(Năng lực[^:]+:|Phẩm chất[^:]*:|\d+\.\s*Về[^:]+:|\w\)\s*Mục tiêu:|\w\)\s*Nội dung:|\w\)\s*Sản phẩm:|\w\)\s*Tổ chức thực hiện:)/i);
    if (boldKeywordMatch && !isViLineBold) {
      const keyword = boldKeywordMatch[2];
      const rest = node.contentVi.slice(boldKeywordMatch[0].length);
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
          text: viPrefix + node.contentVi,
          bold: isViLineBold,
          italics: node.isItalic || false,
          size: fontSizeHalf,
          font: 'Times New Roman',
          color: textColor,
        })
      );
    }

    // Vietnamese paragraph
    childrenElements.push(
      new Paragraph({
        alignment: isCenterTitle ? AlignmentType.CENTER : align,
        spacing: {
          before: isHeaderNode ? 120 : 40,
          after: node.contentEn ? 10 : 40,
          line: 276, // 1.15 line spacing
        },
        children: viTextRuns,
      })
    );

    // English translation paragraph (italic blue #003399 on the next line)
    if (node.contentEn) {
      const enPrefix = node.type === 'bullet' ? '  ' : '';
      const cleanEnText = node.contentEn.replace(/^\s*[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]\s*$/, '').trim();

      if (cleanEnText) {
        childrenElements.push(
          new Paragraph({
            alignment: isCenterTitle ? AlignmentType.CENTER : align,
            spacing: { before: 0, after: 60, line: 276 },
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

  // Create the Word Document
  const docxFile = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,    // ~2cm
              right: 1134,  // ~2cm
              bottom: 1134, // ~2cm
              left: 1701,   // ~3cm (left margin wider for binding)
            },
          },
        },
        children: childrenElements,
      },
    ],
  });

  // Pack and download
  const blob = await Packer.toBlob(docxFile);
  const cleanTitle = doc.title.replace(/[^a-zA-Z0-9_àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ \-]/gi, '_').replace(/_+/g, '_');
  saveAs(blob, `${cleanTitle}_SongNgu.docx`);
}
