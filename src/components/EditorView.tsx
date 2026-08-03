import React, { useState, useEffect } from 'react';
import {
  LessonPlanDocument,
  PlanNode,
  BilingualStyle,
  TranslationStyleOption,
} from '../types';
import { parseUploadedFileToNodes } from '../utils/documentParser';
import { exportLessonPlanToDocx } from '../utils/docxExporter';
import { QualityAuditModal } from './QualityAuditModal';
import { loadSavedApiKey } from './ApiKeyModal';
import {
  Sparkles,
  ShieldCheck,
  Download,
  Sliders,
  Key,
  RotateCcw,
  FileText,
  FileUp,
  Save,
  Copy,
  CheckCircle,
} from 'lucide-react';

interface EditorViewProps {
  currentDoc: LessonPlanDocument;
  setCurrentDoc: React.Dispatch<React.SetStateAction<LessonPlanDocument>>;
  onSaveToLibrary: (doc: LessonPlanDocument) => void;
  onOpenApiKeyModal: () => void;
}

const SETTINGS_KEY = 'user_khbd_settings_v2';
const API_KEY_STORAGE = 'gemini_api_key_v1';
const SELECTED_MODEL_STORAGE = 'gemini_selected_model_v1';

// Smart Educational Fallback Translator Dictionary for GDPT 2018 / CV 5512
function fallbackTranslateVietnameseText(text: string): string {
  if (!text || !text.trim()) return '';

  let translated = text;

  // === PHASE 1: Full-line exact match for common headings/structure ===
  const fullLineDict: [RegExp, string][] = [
    [/^KẾ HOẠCH BÀI DẠY$/i, 'LESSON PLAN'],
    [/^GIÁO ÁN$/i, 'LESSON PLAN'],
    [/^BÀI HỌC$/i, 'LESSON'],
    [/^I\s*\.?\s*MỤC TIÊU/i, 'I. OBJECTIVES'],
    [/^MỤC TIÊU/i, 'OBJECTIVES'],
    [/^II\s*\.?\s*THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU/i, 'II. TEACHING EQUIPMENT AND LEARNING MATERIALS'],
    [/^THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU/i, 'TEACHING EQUIPMENT AND LEARNING MATERIALS'],
    [/^III\s*\.?\s*TIẾN TRÌNH DẠY HỌC/i, 'III. TEACHING PROCEDURES'],
    [/^TIẾN TRÌNH DẠY HỌC/i, 'TEACHING PROCEDURES'],
    [/^HOẠT ĐỘNG KHỞI ĐỘNG/i, 'WARM-UP ACTIVITY'],
    [/^HOẠT ĐỘNG MỞ ĐẦU/i, 'INTRODUCTION ACTIVITY'],
    [/^HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI/i, 'NEW KNOWLEDGE FORMATION ACTIVITY'],
    [/^HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC/i, 'NEW KNOWLEDGE FORMATION ACTIVITY'],
    [/^HOẠT ĐỘNG LUYỆN TẬP/i, 'PRACTICE ACTIVITY'],
    [/^HOẠT ĐỘNG VẬN DỤNG/i, 'APPLICATION ACTIVITY'],
    [/^HOẠT ĐỘNG TÌM TÒI MỞ RỘNG/i, 'EXPLORATION AND EXTENSION ACTIVITY'],
    [/^Hoạt động (\d+)/i, 'Activity $1'],
    [/^Bước 1\s*[:\.]?\s*Chuyển giao nhiệm vụ/i, 'Step 1: Task Assignment'],
    [/^Bước 2\s*[:\.]?\s*Thực hiện nhiệm vụ/i, 'Step 2: Task Execution'],
    [/^Bước 3\s*[:\.]?\s*Báo cáo,?\s*thảo luận/i, 'Step 3: Presentation and Discussion'],
    [/^Bước 4\s*[:\.]?\s*Kết luận,?\s*nhận định/i, 'Step 4: Conclusion and Assessment'],
    [/^a\)\s*Mục tiêu/i, 'a) Objectives'],
    [/^b\)\s*Nội dung/i, 'b) Content'],
    [/^c\)\s*Sản phẩm/i, 'c) Expected Products'],
    [/^d\)\s*Tổ chức thực hiện/i, 'd) Implementation'],
    [/^1\s*\.?\s*Kiến thức/i, '1. Knowledge'],
    [/^2\s*\.?\s*Năng lực/i, '2. Competencies'],
    [/^3\s*\.?\s*Phẩm chất/i, '3. Character Qualities'],
    [/^Năng lực chung/i, 'General Competencies'],
    [/^Năng lực đặc thù/i, 'Specific Competencies'],
    [/^Yêu cầu cần đạt/i, 'Requirements to be achieved'],
    [/^Phương pháp dạy học/i, 'Teaching methods'],
    [/^Hình thức tổ chức/i, 'Organization form'],
    [/^Chuẩn bị của giáo viên/i, 'Teacher preparation'],
    [/^Chuẩn bị của học sinh/i, 'Student preparation'],
    [/^Rút kinh nghiệm/i, 'Lesson reflection'],
    [/^Hướng dẫn về nhà/i, 'Homework guidance'],
    [/^Củng cố/i, 'Consolidation'],
    [/^Dặn dò/i, 'Homework assignment'],
    [/^Bài tập về nhà/i, 'Homework'],
    [/^Ổn định tổ chức/i, 'Class organization'],
    [/^Kiểm tra bài cũ/i, 'Previous lesson review'],
    [/^Bài mới/i, 'New lesson'],
    [/^Luyện tập/i, 'Practice'],
    [/^Vận dụng/i, 'Application'],
    [/^Mở đầu/i, 'Introduction'],
    [/^Khởi động/i, 'Warm-up'],
  ];

  for (const [regex, replacement] of fullLineDict) {
    if (regex.test(translated)) {
      translated = translated.replace(regex, replacement);
      return translated;
    }
  }

  // === PHASE 2: Word/phrase-level replacement for complex sentences ===
  const phraseDict: [RegExp, string][] = [
    // Roles
    [/Giáo viên/gi, 'Teacher'],
    [/Học sinh/gi, 'Students'],
    [/GV/g, 'Teacher'],
    [/HS/g, 'Students'],
    // Actions
    [/chuyển giao nhiệm vụ/gi, 'assigns tasks'],
    [/thực hiện nhiệm vụ/gi, 'execute the task'],
    [/báo cáo kết quả/gi, 'report results'],
    [/báo cáo, thảo luận/gi, 'present and discuss'],
    [/báo cáo/gi, 'report'],
    [/thảo luận nhóm/gi, 'group discussion'],
    [/thảo luận/gi, 'discuss'],
    [/kết luận, nhận định/gi, 'conclude and assess'],
    [/kết luận/gi, 'conclusion'],
    [/nhận định/gi, 'assessment'],
    [/nhận xét/gi, 'comment'],
    [/đánh giá/gi, 'evaluate'],
    [/quan sát/gi, 'observe'],
    [/lắng nghe/gi, 'listen'],
    [/trả lời/gi, 'answer'],
    [/hỏi đáp/gi, 'Q&A'],
    [/đặt câu hỏi/gi, 'ask questions'],
    [/nêu vấn đề/gi, 'raise the problem'],
    [/giải quyết vấn đề/gi, 'solve the problem'],
    [/phát hiện/gi, 'discover'],
    [/vận dụng/gi, 'apply'],
    [/luyện tập/gi, 'practice'],
    [/hoàn thành/gi, 'complete'],
    [/trình bày/gi, 'present'],
    [/giải thích/gi, 'explain'],
    [/chứng minh/gi, 'prove'],
    [/tính toán/gi, 'calculate'],
    [/so sánh/gi, 'compare'],
    [/phân tích/gi, 'analyze'],
    [/tổng hợp/gi, 'synthesize'],
    [/sáng tạo/gi, 'create'],
    [/hợp tác/gi, 'cooperate'],
    [/tự học/gi, 'self-study'],
    [/tự chủ/gi, 'autonomy'],
    [/giao tiếp/gi, 'communicate'],
    [/làm việc nhóm/gi, 'teamwork'],
    [/làm việc/gi, 'work'],
    [/thực hành/gi, 'practice'],
    [/thí nghiệm/gi, 'experiment'],
    [/nghiên cứu/gi, 'research'],
    [/tìm hiểu/gi, 'explore'],
    [/khám phá/gi, 'discover'],
    [/chia sẻ/gi, 'share'],
    [/hướng dẫn/gi, 'guide'],
    [/yêu cầu/gi, 'require'],
    [/gợi ý/gi, 'suggest'],
    [/hỗ trợ/gi, 'support'],
    [/giúp đỡ/gi, 'help'],
    [/chốt kiến thức/gi, 'consolidate knowledge'],
    [/kiểm tra/gi, 'check'],
    [/đọc/gi, 'read'],
    [/viết/gi, 'write'],
    [/nghe/gi, 'listen'],
    [/nói/gi, 'speak'],
    [/xem/gi, 'view'],
    [/làm/gi, 'do'],
    [/học/gi, 'study'],
    // Nouns - Education
    [/mục tiêu/gi, 'objectives'],
    [/nội dung/gi, 'content'],
    [/sản phẩm/gi, 'products'],
    [/nhiệm vụ/gi, 'task'],
    [/hoạt động/gi, 'activity'],
    [/kiến thức/gi, 'knowledge'],
    [/năng lực/gi, 'competency'],
    [/phẩm chất/gi, 'qualities'],
    [/kỹ năng/gi, 'skills'],
    [/thái độ/gi, 'attitude'],
    [/phương pháp/gi, 'method'],
    [/hình thức/gi, 'form'],
    [/phương tiện/gi, 'means'],
    [/thiết bị/gi, 'equipment'],
    [/học liệu/gi, 'learning materials'],
    [/dụng cụ/gi, 'tools'],
    [/tài liệu/gi, 'documents'],
    [/sách giáo khoa/gi, 'textbook'],
    [/SGK/g, 'textbook'],
    [/SBT/g, 'workbook'],
    [/sách bài tập/gi, 'workbook'],
    [/vở ghi/gi, 'notebook'],
    [/bảng phụ/gi, 'auxiliary board'],
    [/bảng nhóm/gi, 'group board'],
    [/phiếu học tập/gi, 'worksheet'],
    [/máy chiếu/gi, 'projector'],
    [/máy tính/gi, 'computer'],
    [/bài tập/gi, 'exercise'],
    [/bài toán/gi, 'problem'],
    [/bài học/gi, 'lesson'],
    [/tiết học/gi, 'class period'],
    [/chương/gi, 'chapter'],
    [/bài/gi, 'lesson'],
    [/phần/gi, 'section'],
    [/nhóm/gi, 'group'],
    [/cá nhân/gi, 'individual'],
    [/cả lớp/gi, 'whole class'],
    [/lớp/gi, 'class'],
    [/trường/gi, 'school'],
    [/giáo án/gi, 'lesson plan'],
    [/chương trình/gi, 'curriculum'],
    // Subjects
    [/Toán học/gi, 'Mathematics'],
    [/Toán/gi, 'Mathematics'],
    [/Ngữ văn/gi, 'Literature'],
    [/Tiếng Anh/gi, 'English'],
    [/Vật lý/gi, 'Physics'],
    [/Vật lí/gi, 'Physics'],
    [/Hóa học/gi, 'Chemistry'],
    [/Sinh học/gi, 'Biology'],
    [/Lịch sử/gi, 'History'],
    [/Địa lý/gi, 'Geography'],
    [/Địa lí/gi, 'Geography'],
    [/Tin học/gi, 'Informatics'],
    [/Công nghệ/gi, 'Technology'],
    [/Giáo dục công dân/gi, 'Civic Education'],
    [/Đạo đức/gi, 'Ethics'],
    [/Thể dục/gi, 'Physical Education'],
    [/Âm nhạc/gi, 'Music'],
    [/Mỹ thuật/gi, 'Fine Arts'],
    // Time & quantity
    [/phút/gi, 'minutes'],
    [/tiết/gi, 'period'],
    [/buổi/gi, 'session'],
    [/tuần/gi, 'week'],
    [/tháng/gi, 'month'],
    [/năm/gi, 'year'],
    [/ngày/gi, 'day'],
    // Connectors
    [/và/gi, 'and'],
    [/hoặc/gi, 'or'],
    [/nhưng/gi, 'but'],
    [/vì/gi, 'because'],
    [/để/gi, 'to'],
    [/của/gi, 'of'],
    [/trong/gi, 'in'],
    [/trên/gi, 'on'],
    [/theo/gi, 'according to'],
    [/với/gi, 'with'],
    [/từ/gi, 'from'],
    [/các/gi, 'the'],
    [/những/gi, 'the'],
    [/một/gi, 'a'],
    [/này/gi, 'this'],
    [/đó/gi, 'that'],
    [/về/gi, 'about'],
    [/tại/gi, 'at'],
    [/sau/gi, 'after'],
    [/trước/gi, 'before'],
    [/rồi/gi, 'then'],
    [/đã/gi, 'already'],
    [/đang/gi, 'is'],
    [/sẽ/gi, 'will'],
    [/được/gi, 'be able to'],
    [/có thể/gi, 'can'],
    [/cần/gi, 'need'],
    [/phải/gi, 'must'],
    [/nên/gi, 'should'],
    // Misc
    [/chú ý/gi, 'note'],
    [/lưu ý/gi, 'note'],
    [/ví dụ/gi, 'example'],
    [/kết quả/gi, 'result'],
    [/chuẩn bị/gi, 'prepare'],
    [/ôn tập/gi, 'review'],
    [/cuối/gi, 'final'],
    [/đầu/gi, 'beginning'],
    [/mới/gi, 'new'],
    [/cũ/gi, 'old'],
    [/đúng/gi, 'correct'],
    [/sai/gi, 'incorrect'],
    [/tốt/gi, 'good'],
    [/nhà/gi, 'home'],
  ];

  for (const [regex, replacement] of phraseDict) {
    translated = translated.replace(regex, replacement);
  }

  // Clean up extra spaces
  translated = translated.replace(/\s{2,}/g, ' ').trim();

  return translated;
}

export const EditorView: React.FC<EditorViewProps> = ({
  currentDoc,
  setCurrentDoc,
  onSaveToLibrary,
  onOpenApiKeyModal,
}) => {
  // Config state
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [bilingualStyle, setBilingualStyle] = useState<BilingualStyle>('parallel');
  const [translationTone, setTranslationTone] = useState<TranslationStyleOption>('academic');
  const [apiKey, setApiKey] = useState<string>('');

  // Execution state
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{
    current: number;
    total: number;
    pct: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'source' | 'bilingual'>('bilingual');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load saved configuration
  useEffect(() => {
    try {
      const savedKey = loadSavedApiKey();
      setApiKey(savedKey);

      const savedModel = localStorage.getItem(SELECTED_MODEL_STORAGE);
      if (savedModel) setSelectedModel(savedModel);

      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.bilingualStyle) setBilingualStyle(parsed.bilingualStyle);
          if (parsed.translationTone) setTranslationTone(parsed.translationTone);
          if (parsed.selectedModel) setSelectedModel(parsed.selectedModel);
        }
      }
    } catch (e) {
      console.error('Failed to load user settings:', e);
    }
  }, []);

  // Upload file handler — Strictly .docx only
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Hệ thống chỉ tiếp nhận tệp Word (.docx). Vui lòng tải lên file định dạng .docx.');
      return;
    }

    try {
      const nodes = await parseUploadedFileToNodes(file);
      const newDoc: LessonPlanDocument = {
        id: `doc-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        level: currentDoc.level || 'thcs',
        subject: currentDoc.subject || 'toan',
        alignmentMode: currentDoc.alignmentMode,
        aiMode: currentDoc.aiMode,
        nodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pageCount: Math.ceil(nodes.length / 8) || 1,
        originalFileName: file.name,
      };

      setCurrentDoc(newDoc);
      onSaveToLibrary(newDoc);
      setCurrentStep(2);
      triggerToast(`Đã tải thành công giáo án "${file.name}"!`);

      // performTranslation tự quản lý isTranslating state — không set ở đây
      setTimeout(() => {
        performTranslation(nodes);
      }, 200);
    } catch (error) {
      console.error('File parse error:', error);
      alert('Không thể đọc tệp Word (.docx). Vui lòng kiểm tra lại định dạng tệp.');
    }
  };

  // Perform Gemini AI Translation with Progressive Paragraph-by-Paragraph Batching & Reliable Fallback
  const performTranslation = async (targetNodes: PlanNode[]) => {
    const activeApiKey = apiKey || loadSavedApiKey();
    if (!activeApiKey || activeApiKey.trim().length < 10) {
      onOpenApiKeyModal();
      return;
    }

    const nodesToProcess = targetNodes && targetNodes.length > 0 ? targetNodes : currentDoc.nodes;

    setIsTranslating(true);
    setCurrentStep(2);
    setTranslationProgress({ current: 0, total: 1, pct: 0 });

    try {
      const itemsToTranslate: { id: string; text: string }[] = [];
      const emptyParaIds = new Set<string>(); // Track empty paragraphs to preserve sync
      nodesToProcess.forEach((node) => {
        if (node.type === 'table' && node.tableRows) {
          node.tableRows.forEach((row) => {
            row.cells.forEach((cell) => {
              if (cell.paragraphs && cell.paragraphs.length > 0) {
                cell.paragraphs.forEach((p) => {
                  if (p.contentVi && p.contentVi.trim()) {
                    itemsToTranslate.push({ id: p.id, text: p.contentVi });
                  } else {
                    // Paragraph rỗng — đánh dấu để giữ sync, gán contentEn rỗng
                    emptyParaIds.add(p.id);
                  }
                });
              } else if (cell.contentVi && cell.contentVi.trim()) {
                itemsToTranslate.push({ id: cell.id, text: cell.contentVi });
              }
            });
          });
        } else {
          if (node.contentVi && node.contentVi.trim()) {
            itemsToTranslate.push({ id: node.id, text: node.contentVi });
          }
        }
      });

      if (itemsToTranslate.length === 0) {
        setIsTranslating(false);
        setTranslationProgress(null);
        return;
      }

      // Pre-set empty paragraphs in translation map so they don't break cell.contentEn assembly
      const translationsMap = new Map<string, string>();
      emptyParaIds.forEach((id) => translationsMap.set(id, ''));

      setTranslationProgress({ current: 0, total: itemsToTranslate.length, pct: 0 });

      const BATCH_SIZE = 15;

      for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
        const chunk = itemsToTranslate.slice(i, i + BATCH_SIZE);
        let chunkTransMap = new Map<string, string>();
        let apiSuccess = false;

        // Step A: Try Server Proxy API
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: chunk,
              aiMode: currentDoc.aiMode || 'fast',
              level: currentDoc.level || 'thcs',
              subject: currentDoc.subject || 'toan',
              grade: currentDoc.grade || 'lop8',
              tone: translationTone,
              model: selectedModel,
              userApiKey: activeApiKey,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.items) && data.items.length > 0) {
              data.items.forEach((item: any) => {
                if (item.id && item.text) {
                  chunkTransMap.set(item.id, item.text);
                }
              });
              apiSuccess = chunkTransMap.size > 0;
            }
          }
        } catch (e) {
          console.warn('Server proxy translation failed, attempting direct Gemini API call...', e);
        }

        // Step B: Try Direct Gemini REST API with Model Chain Fallback
        if (!apiSuccess && activeApiKey && activeApiKey.trim().length > 10) {
          try {
            chunkTransMap = await translateChunkWithGeminiDirect(
              chunk,
              activeApiKey.trim(),
              selectedModel,
              currentDoc.subject || 'toan',
              currentDoc.level || 'thcs',
              currentDoc.grade || 'lop8',
              translationTone
            );
            apiSuccess = chunkTransMap.size > 0;
          } catch (directErr) {
            console.error('Direct Gemini API call failed:', directErr);
          }
        }

        // Step C: Fallback Dictionary Translation if AI is unreachable
        chunk.forEach((item) => {
          if (!chunkTransMap.has(item.id)) {
            const fbText = fallbackTranslateVietnameseText(item.text);
            chunkTransMap.set(item.id, fbText);
          }
        });

        chunkTransMap.forEach((val, key) => {
          translationsMap.set(key, val);
        });

        // Progressive UI update
        setCurrentDoc((prev) => {
          const updatedNodes = prev.nodes.map((node) => {
            if (node.type === 'table' && node.tableRows) {
              const updatedRows = node.tableRows.map((row) => {
                const updatedCells = row.cells.map((cell) => {
                  let updatedParas = cell.paragraphs;
                  if (cell.paragraphs && cell.paragraphs.length > 0) {
                    updatedParas = cell.paragraphs.map((p) => {
                      const pTrans = translationsMap.get(p.id);
                      return pTrans !== undefined ? { ...p, contentEn: pTrans } : p;
                    });
                  }
                  const cellTrans = translationsMap.get(cell.id);
                  const combinedEn = updatedParas && updatedParas.length > 0
                    ? updatedParas.map((p) => p.contentEn).filter(Boolean).join('\n')
                    : cellTrans;

                  return {
                    ...cell,
                    contentEn: combinedEn !== undefined ? combinedEn : cell.contentEn,
                    paragraphs: updatedParas,
                  };
                });
                return { ...row, cells: updatedCells };
              });
              return { ...node, tableRows: updatedRows };
            } else {
              const trans = translationsMap.get(node.id);
              return trans !== undefined ? { ...node, contentEn: trans } : node;
            }
          });
          return { ...prev, nodes: updatedNodes, updatedAt: new Date().toISOString() };
        });

        const currentDone = Math.min(itemsToTranslate.length, i + BATCH_SIZE);
        const pct = Math.round((currentDone / itemsToTranslate.length) * 100);

        setTranslationProgress({
          current: currentDone,
          total: itemsToTranslate.length,
          pct,
        });
      }

      setCurrentStep(3);
      triggerToast('✓ Hoàn tất dịch thuật song ngữ AI!');
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
      setTimeout(() => setTranslationProgress(null), 2000);
    }
  };

  // Ultra-Robust Direct Gemini REST API Client with JSON Extraction & Retry
  const translateChunkWithGeminiDirect = async (
    chunkObjects: { id: string; text: string }[],
    userKey: string,
    initialModel: string,
    subject: string,
    level: string,
    grade: string,
    tone: string
  ): Promise<Map<string, string>> => {
    const modelsToTry = Array.from(
      new Set([initialModel, 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'])
    );

    const resultMap = new Map<string, string>();
    let lastError: any = null;

    const toneGuide = tone === 'simple'
      ? 'Dùng từ vựng đơn giản, dễ hiểu cho học sinh.'
      : tone === 'formal'
      ? 'Dùng văn phong trang trọng, hành chính - học thuật.'
      : 'Dùng chuẩn thuật ngữ chuyên ngành GDPT 2018 / CV 5512.';

    const promptText = `Bạn là chuyên gia dịch thuật giáo dục Việt - Anh GDPT 2018.
Môn: ${subject}, Cấp: ${level}, Lớp: ${grade}. Phong cách: ${toneGuide}

QUY TẮC:
1. Dịch 100% sang tiếng Anh thuần túy, KHÔNG chèn tiếng Việt.
2. KHÔNG đặt bản dịch trong ngoặc đơn (...).
3. Giữ nguyên công thức toán/hóa, ký hiệu, số liệu.
4. Trả về DUY NHẤT mảng JSON, không markdown.

MẢNG CẦN DỊCH:
${JSON.stringify(chunkObjects, null, 2)}

Trả về duy nhất mảng JSON dạng: [{"id": "id_goc", "text": "English translation"}]`;

    for (let modelIdx = 0; modelIdx < modelsToTry.length; modelIdx++) {
      const model = modelsToTry[modelIdx];
      // Try with responseMimeType first, then without
      const configsToTry = [
        { responseMimeType: 'application/json' },
        {},
      ];

      for (const config of configsToTry) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userKey}`;

          const payload: any = {
            contents: [{ parts: [{ text: promptText }] }],
          };
          if (config.responseMimeType) {
            payload.generationConfig = { responseMimeType: config.responseMimeType };
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (response.status === 429 || response.status === 403) {
            // Rate limited — wait before trying next model
            if (modelIdx < modelsToTry.length - 1) {
              await new Promise((r) => setTimeout(r, 1500));
            }
            continue;
          }

          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!textResponse) continue;

          // Robust JSON extraction — strip markdown fences and find JSON array
          let cleanJsonStr = textResponse.trim();
          // Remove markdown code fences (```json ... ``` or ``` ... ```)
          cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
          // Try to find JSON array pattern
          const matchArray = cleanJsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (matchArray) {
            cleanJsonStr = matchArray[0];
          }

          let parsed: any[] = [];
          try {
            parsed = JSON.parse(cleanJsonStr);
          } catch {
            // Regex match individual objects if array parsing failed
            const objRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
            let m;
            while ((m = objRegex.exec(textResponse)) !== null) {
              resultMap.set(m[1], m[2].replace(/\\"/g, '"'));
            }
          }

          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item.id && item.text) {
                resultMap.set(item.id, item.text);
              }
            });
          }

          if (resultMap.size > 0) return resultMap;
        } catch (err) {
          lastError = err;
        }
      }

      // Delay between model attempts to avoid rate limits
      if (modelIdx < modelsToTry.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    return resultMap;
  };

  // TAB ACTION 1: Save to Library Action
  const handleSaveToLibraryClick = () => {
    onSaveToLibrary(currentDoc);
    triggerToast('✓ Đã lưu bài dạy vào Thư viện thành công!');
  };

  // TAB ACTION 2: Robust Copy Bilingual Text to Clipboard
  const handleCopyToClipboard = () => {
    const textLines: string[] = [];
    currentDoc.nodes.forEach((node) => {
      if (node.type === 'table' && node.tableRows) {
        node.tableRows.forEach((r) => {
          r.cells.forEach((c) => {
            if (c.paragraphs && c.paragraphs.length > 0) {
              c.paragraphs.forEach((p) => {
                textLines.push(p.contentVi);
                if (p.contentEn) textLines.push(`  (${p.contentEn})`);
              });
            } else {
              textLines.push(c.contentVi);
              if (c.contentEn) textLines.push(`  (${c.contentEn})`);
            }
          });
        });
      } else {
        if (node.contentVi) textLines.push(node.contentVi);
        if (node.contentEn) textLines.push(`  ${node.contentEn}`);
      }
    });

    const fullContent = textLines.join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(fullContent)
        .then(() => triggerToast('📋 Đã sao chép toàn bộ nội dung giáo án song ngữ vào Clipboard!'))
        .catch(() => fallbackCopyTextToClipboard(fullContent));
    } else {
      fallbackCopyTextToClipboard(fullContent);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      triggerToast('📋 Đã sao chép toàn bộ nội dung giáo án song ngữ vào Clipboard!');
    } catch (err) {
      alert('Đã chọn toàn bộ nội dung. Thầy cô vui lòng nhấn Ctrl+C để copy!');
    }
  };

  const handleTranslateAll = () => {
    performTranslation(currentDoc.nodes);
  };

  const handleReset = () => {
    if (confirm('Khôi phục bản tiếng Việt gốc và làm mới trang xem trước?')) {
      const resetNodes = currentDoc.nodes.map((n) => ({
        ...n,
        contentEn: '',
        tableRows: n.tableRows
          ? n.tableRows.map((r) => ({
              ...r,
              cells: r.cells.map((c) => ({
                ...c,
                contentEn: '',
                paragraphs: c.paragraphs ? c.paragraphs.map((p) => ({ ...p, contentEn: '' })) : undefined,
              })),
            }))
          : undefined,
      }));
      setCurrentDoc({ ...currentDoc, nodes: resetNodes });
      setCurrentStep(1);
    }
  };

  const handleUpdateNodeContent = (
    id: string,
    field: 'contentVi' | 'contentEn',
    val: string
  ) => {
    const updated = currentDoc.nodes.map((n) =>
      n.id === id ? { ...n, [field]: val } : n
    );
    setCurrentDoc({ ...currentDoc, nodes: updated });
  };

  const handleUpdateTableCellParagraph = (
    nodeId: string,
    rowId: string,
    cellId: string,
    paraId: string,
    val: string
  ) => {
    const updated = currentDoc.nodes.map((n) => {
      if (n.id !== nodeId || !n.tableRows) return n;
      const newRows = n.tableRows.map((r) => {
        if (r.id !== rowId) return r;
        const newCells = r.cells.map((c) => {
          if (c.id !== cellId) return c;
          const updatedParas = (c.paragraphs || []).map((p) =>
            p.id === paraId ? { ...p, contentEn: val } : p
          );
          const combinedEn = updatedParas.map((p) => p.contentEn).filter(Boolean).join('\n');
          return { ...c, contentEn: combinedEn, paragraphs: updatedParas };
        });
        return { ...r, cells: newCells };
      });
      return { ...n, tableRows: newRows };
    });
    setCurrentDoc({ ...currentDoc, nodes: updated });
  };

  return (
    <div className="app-main flex flex-col lg:flex-row gap-6 relative">
      {/* Toast Notification inside EditorView */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 px-4 py-3 rounded-2xl bg-teal-900 text-white font-bold text-xs shadow-2xl border border-teal-500 animate-bounce flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT COLUMN: SIDEBAR CONFIGURATION PANEL */}
      <aside className="settings-sidebar card-glass w-full lg:w-80 shrink-0 space-y-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
            <Sliders className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Cấu Hình Dịch Thuật</h2>
        </div>

        <div className="p-5 space-y-5">
          {/* Gemini API Key Section */}
          <div className="form-group space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Gemini API Key</span>
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="text-[11px] text-red-600 dark:text-red-400 font-extrabold hover:underline"
              >
                Lấy API Key
              </button>
            </label>

            <div className="relative flex items-center">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  const val = e.target.value;
                  setApiKey(val);
                  localStorage.setItem(API_KEY_STORAGE, val);
                }}
                placeholder="Nhập API Key (AIzaSy...)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500 pr-8"
              />
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="absolute right-2 p-1 text-slate-400 hover:text-teal-600"
                title="Cài đặt Key"
              >
                <Key className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              {apiKey ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Đã thiết lập Key</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold">⚠ Chưa dán API Key</span>
              )}
            </div>
          </div>

          {/* Gemini AI Models */}
          <div className="form-group space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mô hình AI Dịch Thuật</label>
            <div className="space-y-1.5">
              {[
                {
                  id: 'gemini-2.5-flash',
                  title: 'gemini-2.5-flash ⚡ MIỄN PHÍ',
                  desc: 'Nhanh, miễn phí, cân bằng chất lượng/tốc độ. Khuyến nghị!',
                },
                {
                  id: 'gemini-2.5-flash-lite',
                  title: 'gemini-2.5-flash-lite 💨 MIỄN PHÍ',
                  desc: 'Siêu nhẹ & nhanh nhất, tiết kiệm quota tối đa.',
                },
                {
                  id: 'gemini-2.0-flash',
                  title: 'gemini-2.0-flash 🔄 MIỄN PHÍ',
                  desc: 'Dự phòng ổn định, tốc độ tốt khi model mới hết quota.',
                },
                {
                  id: 'gemini-2.0-flash-lite',
                  title: 'gemini-2.0-flash-lite ♻️ MIỄN PHÍ',
                  desc: 'Nhẹ nhất dòng 2.0, dự phòng khi các model khác hết hạn ngạch.',
                },
                {
                  id: 'gemini-1.5-flash',
                  title: 'gemini-1.5-flash 🛡️ MIỄN PHÍ',
                  desc: 'Bản cũ nhưng rất ổn định, luôn có sẵn quota miễn phí.',
                },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    localStorage.setItem(SELECTED_MODEL_STORAGE, m.id);
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedModel === m.id
                      ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 font-bold ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold">{m.title}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Translation Tone */}
          <div className="form-group space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phong cách dịch</label>
            <select
              value={translationTone}
              onChange={(e) => {
                const newTone = e.target.value as TranslationStyleOption;
                setTranslationTone(newTone);
                try {
                  const saved = localStorage.getItem(SETTINGS_KEY);
                  const parsed = saved ? JSON.parse(saved) : {};
                  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, translationTone: newTone }));
                } catch {}
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="academic">Dịch sát chuyên ngành GDPT 2018</option>
              <option value="simple">Dễ hiểu cho học sinh (Simple)</option>
              <option value="formal">Trang trọng (Formal report)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: MAIN CONTENT & PREVIEW */}
      <section className="content-area flex-1 space-y-6 min-w-0">
        {/* STEPPER */}
        <div className="stepper card-glass flex items-center justify-between p-4 rounded-2xl text-xs">
          <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
            <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-xs">1</span>
            <span>Tải giáo án gốc</span>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 mx-3" />

          <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'font-bold text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
            <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-300 flex items-center justify-center font-bold text-xs">2</span>
            <span>Dịch & Xem trước</span>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 mx-3" />

          <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-xs">3</span>
            <span>Xuất file Word song ngữ</span>
          </div>
        </div>

        {/* FILE UPLOAD ZONE — Strictly .docx only */}
        <div className="card-glass p-6 rounded-3xl space-y-4 text-center">
          <div className="upload-zone border-2 border-dashed border-teal-200 dark:border-teal-900/60 hover:border-teal-500 transition-all rounded-2xl p-8 cursor-pointer bg-teal-50/20 dark:bg-teal-950/10" onClick={() => document.getElementById('docx-file-input')?.click()}>
            <input
              id="docx-file-input"
              type="file"
              accept=".docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto mb-3">
              <FileUp className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Kéo thả hoặc nhấp để tải Kế hoạch bài dạy (.docx)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Bảo lưu 100% định dạng gốc (căn đều 2 bên, bảng biểu, in đậm, in nghiêng & công thức toán)
            </p>
          </div>

          {currentDoc.nodes.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-teal-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{currentDoc.title}</h4>
                  <p className="text-[11px] text-slate-400">{currentDoc.nodes.length} phần tử giáo án • Bảo lưu định dạng gốc 100%</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>DỊCH SONG NGỮ AI</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TRANSLATION PROGRESS CARD */}
        {(isTranslating || translationProgress) && (
          <div className="card-glass p-5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-teal-900 dark:text-teal-200">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>
                  Đang dịch thuật giáo án song ngữ theo từng Paragraph ({translationProgress?.current || 0}/{translationProgress?.total || 0} phần tử)...
                </span>
              </span>
              <span>{translationProgress?.pct || 0}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-teal-200 dark:bg-teal-900 overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all duration-300"
                style={{ width: `${translationProgress?.pct || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* SCIENTIFIC PREVIEW PANEL (A4 SHEET PREVIEW) */}
        {currentDoc.nodes.length > 0 && (
          <div className="card-glass rounded-3xl shadow-sm overflow-hidden flex flex-col">
            {/* Action Bar Header with 3 Quick Action Tabs */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPreviewTab('bilingual')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewTab === 'bilingual'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Bản dịch song ngữ
                </button>
                <button
                  onClick={() => setPreviewTab('source')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewTab === 'source'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Bản gốc tiếng Việt
                </button>
              </div>

              {/* 3 ACTIVE QUICK ACTION TOOLBAR BUTTONS */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Lưu Thư viện */}
                <button
                  onClick={handleSaveToLibraryClick}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                  title="Lưu bản dịch này vào Thư viện bài dạy"
                >
                  <Save className="w-4 h-4 text-emerald-600" />
                  <span>Lưu Thư viện</span>
                </button>

                {/* 2. Sao chép */}
                <button
                  onClick={handleCopyToClipboard}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs hover:bg-slate-300 border border-slate-300 dark:border-slate-700 transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                  title="Sao chép toàn bộ nội dung giáo án song ngữ"
                >
                  <Copy className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Sao chép</span>
                </button>

                {/* 3. Soát lỗi AI */}
                <button
                  onClick={() => setIsQualityOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs hover:bg-amber-100 border border-amber-300 dark:border-amber-700 transition-all shadow-sm active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                  title="AI rà soát chất lượng & kiểm định lỗi bài dạy"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Soát lỗi AI</span>
                </button>
              </div>
            </div>

            {/* Document Sheet View — Simulated A4 Paper */}
            <div className="p-6 sm:p-10 max-h-[650px] overflow-y-auto bg-slate-100 dark:bg-slate-950/80 flex justify-center">
              <div className="a4-paper-sheet w-full max-w-[800px] p-8 sm:p-12 space-y-3">
                {currentDoc.nodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;

                  let alignClass = 'text-justify';
                  if (node.align === 'center') alignClass = 'text-center';
                  else if (node.align === 'right') alignClass = 'text-right';
                  else if (node.align === 'left') alignClass = 'text-left';

                  if (node.type === 'table' && node.tableRows) {
                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`my-4 p-2 rounded-xl transition-all cursor-pointer ${
                          isSelected ? 'ring-2 ring-teal-500 bg-teal-50/20' : ''
                        }`}
                      >
                        <table className="w-full border-collapse border border-slate-300 dark:border-slate-700">
                          <tbody>
                            {node.tableRows.map((row) => (
                              <tr key={row.id}>
                                {row.cells.map((cell) => {
                                  const cellParas = (cell.paragraphs && cell.paragraphs.length > 0)
                                    ? cell.paragraphs
                                    : (cell.contentVi || '').split('\n').map((line, lIdx) => ({
                                        id: `fallback-p-${lIdx}`,
                                        contentVi: line,
                                        contentEn: (cell.contentEn || '').split('\n')[lIdx] || (lIdx === 0 ? cell.contentEn : ''),
                                        isBold: cell.isHeader || cell.isBold,
                                        align: cell.isHeader ? ('center' as const) : ('justify' as const),
                                      }));

                                  return (
                                    <td
                                      key={cell.id}
                                      className={`border border-slate-300 dark:border-slate-700 p-3 align-top ${
                                        cell.isHeader
                                          ? 'bg-slate-100 dark:bg-slate-800 font-bold text-center'
                                          : 'text-justify'
                                      }`}
                                    >
                                      {cell.imageData && (
                                        <img
                                          src={cell.imageData}
                                          alt="Diagram"
                                          className="max-w-[220px] max-h-[160px] my-1 rounded border border-slate-200 mx-auto block"
                                        />
                                      )}

                                      {cellParas.map((p) => {
                                        let pAlignClass = 'text-justify';
                                        if (p.align === 'center' || cell.isHeader) pAlignClass = 'text-center';
                                        else if (p.align === 'right') pAlignClass = 'text-right';
                                        else if (p.align === 'left') pAlignClass = 'text-left';

                                        return (
                                          <div key={p.id} className={`my-1.5 ${pAlignClass}`}>
                                            <div
                                              className={`text-slate-900 dark:text-slate-100 ${
                                                p.isBold ? 'font-bold' : 'font-normal'
                                              } ${p.isItalic ? 'italic' : ''}`}
                                            >
                                              {p.contentVi}
                                            </div>

                                            {previewTab === 'bilingual' && (
                                              <input
                                                type="text"
                                                placeholder="+ Dịch tiếng Anh theo đoạn..."
                                                value={p.contentEn || ''}
                                                onChange={(e) =>
                                                  handleUpdateTableCellParagraph(
                                                    node.id,
                                                    row.id,
                                                    cell.id,
                                                    p.id,
                                                    e.target.value
                                                  )
                                                }
                                                className={`w-full bg-transparent italic text-[#003399] dark:text-sky-400 font-normal focus:outline-none focus:ring-1 focus:ring-teal-400 rounded px-1 mt-0.5 text-[13pt] ${pAlignClass}`}
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`my-2 p-2 rounded-xl transition-all cursor-pointer ${alignClass} ${
                        isSelected ? 'ring-2 ring-teal-500 bg-teal-50/20' : ''
                      }`}
                    >
                      {node.imageData && (
                        <img
                          src={node.imageData}
                          alt="Illustration"
                          className="max-w-[320px] max-h-[220px] my-2 rounded border border-slate-200 mx-auto block"
                        />
                      )}
                      <div
                        className={`${
                          node.isIntegrated ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-900 dark:text-slate-100'
                        } ${node.isBold ? 'font-bold' : 'font-normal'} ${
                          node.isItalic ? 'italic' : ''
                        }`}
                      >
                        {node.type === 'bullet' ? '• ' : ''}{node.contentVi}
                      </div>

                      {previewTab === 'bilingual' && (
                        <textarea
                          rows={Math.ceil((node.contentEn || '').length / 60) || 1}
                          placeholder="+ Tiếng Anh (Màu xanh #003399, In nghiêng)..."
                          value={node.contentEn || ''}
                          onChange={(e) =>
                            handleUpdateNodeContent(node.id, 'contentEn', e.target.value)
                          }
                          className="w-full bg-transparent italic text-[#003399] dark:text-sky-400 font-normal focus:outline-none focus:ring-1 focus:ring-teal-400 rounded px-1 mt-1 text-[13pt] resize-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Làm lại</span>
              </button>

              <button
                onClick={() => exportLessonPlanToDocx(currentDoc)}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Tải file Word song ngữ (.docx)</span>
              </button>
            </div>
          </div>
        )}

        {/* Quality Audit Modal with Auto Fix Callback */}
        <QualityAuditModal
          isOpen={isQualityOpen}
          onClose={() => setIsQualityOpen(false)}
          nodes={currentDoc.nodes}
          onAutoFix={(fixedNodes) => {
            setCurrentDoc({ ...currentDoc, nodes: fixedNodes });
            triggerToast('✓ Đã hoàn tất tự động sửa tất cả lỗi phát hiện!');
          }}
        />
      </section>
    </div>
  );
};
