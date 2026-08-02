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
 * - Tables: Vi + En stacked in each cell
 * - Embedded Images:Preserved inside cells & paragraphs
 * - No branding headers/footers for clean print output
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
        const docxCells = row.cells.map((cell) => {
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
                      transformation: { width: 200, height: 140 },
                    }),
                  ],
                })
              );
            } catch (e) {
              console.warn('Image embedding error:', e);
            }
          }

          // Vietnamese cell text
          cellParagraphs.push(
            new Paragraph({
              spacing: { before: 20, after: 0 },
              children: [
                new TextRun({
                  text: cell.contentVi,
                  bold: cell.isHeader || false,
                  size: DEFAULT_FONT_SIZE,
                  font: 'Times New Roman',
                  color: '000000',
                }),
              ],
            })
          );

          // English cell text (italic blue, below Vietnamese, no parentheses)
          if (cell.contentEn) {
            const cleanEnText = cell.contentEn.replace(/^\s*[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]\s*$/, '').trim();
            cellParagraphs.push(
              new Paragraph({
                spacing: { before: 20, after: 20 },
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

          return new TableCell({
            children: cellParagraphs,
            verticalAlign: VerticalAlign.TOP,
            width: { size: Math.floor(100 / row.cells.length), type: WidthType.PERCENTAGE },
            shading: cell.isHeader ? { fill: 'F0F4FA' } : undefined,
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
      childrenElements.push(new Paragraph({ spacing: { after: 60 } }));
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

    // Detect title/center lines (e.g. "ÔN TẬP CUỐI HỌC KỲ I")
    const isCenterTitle =
      node.type === 'title' ||
      (node.align === 'center');

    // Embedded Paragraph Image (e.g. diagrams, illustrations)
    if (node.imageData && node.imageData.startsWith('data:image')) {
      try {
        childrenElements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              new ImageRun({
                data: base64ToUint8Array(node.imageData),
                transformation: { width: 280, height: 180 },
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

    // Check for bold keyword pattern like "Năng lực tự chủ, tự học:"
    const boldKeywordMatch = node.contentVi.match(/^(\s*)(Năng lực[^:]+:|Phẩm chất[^:]*:)/);
    if (boldKeywordMatch && !isViLineBold) {
      // Split into bold keyword + rest
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
          after: 0,
        },
        children: viTextRuns,
      })
    );

    // English translation paragraph (italic, blue #003399, on the next line, NO parentheses)
    if (node.contentEn) {
      const enPrefix = node.type === 'bullet' ? '  ' : '';
      const cleanEnText = node.contentEn.replace(/^\s*[\(\[\{]\s*/, '').replace(/\s*[\)\]\}]\s*$/, '').trim();

      childrenElements.push(
        new Paragraph({
          alignment: isCenterTitle ? AlignmentType.CENTER : align,
          spacing: { before: 0, after: 60 },
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
