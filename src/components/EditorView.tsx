import React, { useState, useEffect } from 'react';
import {
  LessonPlanDocument,
  AlignmentMode,
  AIMode,
  PlanNode,
  EducationLevel,
  Subject,
  QualityCheckReport,
  TranslationMode,
  BilingualStyle,
  TranslationStyleOption,
} from '../types';
import { parseUploadedFileToNodes } from '../utils/documentParser';
import { exportLessonPlanToDocx } from '../utils/docxExporter';
import { SUBJECTS_BY_LEVEL, GRADES_BY_LEVEL } from '../utils/subjectHelpers';
import { CompareModal } from './CompareModal';
import { QualityAuditModal } from './QualityAuditModal';
import { loadSavedApiKey } from './ApiKeyModal';
import {
  Upload,
  Sparkles,
  RefreshCw,
  Columns,
  ShieldCheck,
  Download,
  Table as TableIcon,
  Type,
  AlignLeft,
  Sliders,
  Key,
  HelpCircle,
  ExternalLink,
  Zap,
  CheckCircle,
  RotateCcw,
  FileText,
  FileUp,
  FolderOpen,
  Trash2,
  AlertTriangle,
  Layers,
  Plus,
  Save,
  Copy,
  Search,
  Check,
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

export const EditorView: React.FC<EditorViewProps> = ({
  currentDoc,
  setCurrentDoc,
  onSaveToLibrary,
  onOpenApiKeyModal,
}) => {
  // Config state
  const [translationMode, setTranslationMode] = useState<TranslationMode>('ai');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');
  const [bilingualStyle, setBilingualStyle] = useState<BilingualStyle>('parallel');
  const [translationTone, setTranslationTone] = useState<TranslationStyleOption>('academic');
  const [apiKey, setApiKey] = useState<string>('');

  // Scope: Full vs Partial
  const [translationScope, setTranslationScope] = useState<'full' | 'partial'>('full');

  // Execution state
  const [isTranslating, setIsTranslating] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState<{
    current: number;
    total: number;
    pct: number;
  } | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityCheckReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [previewTab, setPreviewTab] = useState<'source' | 'bilingual'>('bilingual');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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
          const newLevel: EducationLevel = parsed.level || 'thcs';
          const availableSubjects = SUBJECTS_BY_LEVEL[newLevel] || [];
          const availableGrades = GRADES_BY_LEVEL[newLevel] || [];

          setCurrentDoc((prev) => ({
            ...prev,
            level: newLevel,
            subject: parsed.subject || availableSubjects[0]?.value || 'toan',
            grade: parsed.grade || availableGrades[0]?.value || 'lop8',
          }));
          if (parsed.bilingualStyle) setBilingualStyle(parsed.bilingualStyle);
          if (parsed.translationTone) setTranslationTone(parsed.translationTone);
          if (parsed.translationMode) setTranslationMode(parsed.translationMode);
          if (parsed.selectedModel) setSelectedModel(parsed.selectedModel);
        }
      }
    } catch (e) {
      console.error('Failed to load user settings:', e);
    }
  }, []);

  const handleUpdateConfig = (updates: Partial<LessonPlanDocument>) => {
    const updatedDoc = { ...currentDoc, ...updates };
    setCurrentDoc(updatedDoc);
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          level: updatedDoc.level,
          subject: updatedDoc.subject,
          grade: updatedDoc.grade,
          bilingualStyle,
          translationTone,
          translationMode,
          selectedModel,
        })
      );
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  // Upload file handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsTranslating(true);
    try {
      const nodes = await parseUploadedFileToNodes(file);
      const newDoc: LessonPlanDocument = {
        id: `doc-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        level: currentDoc.level,
        subject: currentDoc.subject,
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

      setTimeout(() => {
        performTranslation(nodes);
      }, 200);
    } catch (error) {
      console.error('File parse error:', error);
      alert('Không thể đọc tệp Word/PDF. Vui lòng kiểm tra lại định dạng tệp.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Perform Translation with Retry & Model Fallback Chain
  const performTranslation = async (targetNodes: PlanNode[]) => {
    const nodesToProcess = targetNodes && targetNodes.length > 0 ? targetNodes : currentDoc.nodes;

    setIsTranslating(true);
    setCurrentStep(2);
    setTranslationProgress({ current: 0, total: 1, pct: 0 });

    try {
      const itemsToTranslate: { id: string; text: string }[] = [];
      nodesToProcess.forEach((node) => {
        if (node.type === 'table' && node.tableRows) {
          node.tableRows.forEach((row) => {
            row.cells.forEach((cell) => {
              itemsToTranslate.push({ id: cell.id, text: cell.contentVi || '' });
            });
          });
        } else {
          itemsToTranslate.push({ id: node.id, text: node.contentVi || '' });
        }
      });

      if (itemsToTranslate.length === 0) {
        setIsTranslating(false);
        setTranslationProgress(null);
        return;
      }

      setTranslationProgress({ current: 0, total: itemsToTranslate.length, pct: 0 });

      const BATCH_SIZE = 25;
      const translationsMap = new Map<string, string>();

      for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
        const chunk = itemsToTranslate.slice(i, i + BATCH_SIZE);
        let chunkTransMap = new Map<string, string>();

        if (translationMode === 'mock') {
          await new Promise((r) => setTimeout(r, 400));
          chunk.forEach((item) => {
            chunkTransMap.set(item.id, mockTranslateText(item.text));
          });
        } else {
          let apiSuccess = false;
          try {
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: chunk,
                aiMode: currentDoc.aiMode || 'fast',
                level: currentDoc.level,
                subject: currentDoc.subject,
                tone: translationTone,
                model: selectedModel,
                userApiKey: apiKey,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.items)) {
                data.items.forEach((item: any) => {
                  if (item.id && item.text) {
                    chunkTransMap.set(item.id, item.text);
                  }
                });
                apiSuccess = chunkTransMap.size > 0;
              } else if (Array.isArray(data.translations)) {
                chunk.forEach((item, idx) => {
                  if (data.translations[idx]) {
                    chunkTransMap.set(item.id, data.translations[idx]);
                  }
                });
                apiSuccess = chunkTransMap.size > 0;
              }
            }
          } catch (e) {
            console.warn('Server proxy translation failed, trying direct Gemini API call...', e);
          }

          if (!apiSuccess && apiKey && apiKey.trim().length > 10) {
            try {
              chunkTransMap = await translateChunkWithGeminiDirect(
                chunk,
                apiKey.trim(),
                selectedModel,
                currentDoc.subject,
                currentDoc.level,
                currentDoc.grade || 'lop8',
                translationTone
              );
              apiSuccess = chunkTransMap.size > 0;
            } catch (directErr) {
              console.error('Direct Gemini API call failed:', directErr);
            }
          }

          if (!apiSuccess) {
            chunk.forEach((item) => {
              chunkTransMap.set(item.id, mockTranslateText(item.text));
            });
          }
        }

        chunkTransMap.forEach((val, key) => {
          translationsMap.set(key, val);
        });

        setCurrentDoc((prev) => {
          const updatedNodes = prev.nodes.map((node) => {
            if (node.type === 'table' && node.tableRows) {
              const updatedRows = node.tableRows.map((row) => {
                const updatedCells = row.cells.map((cell) => {
                  const trans = translationsMap.get(cell.id);
                  return trans !== undefined ? { ...cell, contentEn: trans } : cell;
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
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
      setTimeout(() => setTranslationProgress(null), 2500);
    }
  };

  // Gemini Direct API Call Helper with Fallback Model Chain
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
      new Set([initialModel, 'gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'])
    );

    const resultMap = new Map<string, string>();
    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${userKey}`;
        const promptText = `Bạn là chuyên gia dịch thuật tài liệu giáo dục và soạn bài giảng (Lesson Plan) Việt - Anh hàng đầu cho giáo viên Việt Nam.
Hãy dịch mảng đối tượng JSON dưới đây từ tiếng Việt sang tiếng Anh cho môn ${subject} cấp ${level} lớp ${grade}.

QUY TẮC DỊCH THUẬT QUAN TRỌNG:
1. Trả về định dạng JSON là một MẢNG các đối tượng có cấu trúc chính xác như sau: [{"id": "...", "text": "bản dịch tiếng Anh"}]. Only return valid raw JSON array.
2. Giữ nguyên TOÀN BỘ các mã ID được cung cấp, không được sửa đổi ID.
3. TUYỆT ĐỐ KHÔNG LẶP LẠI TIẾNG VIỆT GỐC VÀ KHÔNG BỌC NGOẶC ĐƠN (...).
4. Giữ nguyên công thức toán, số liệu, tên riêng, ký hiệu khoa học.
5. Với tiêu đề giáo án hoặc các mục chính:
   - "Mục tiêu" -> "Objectives"
   - "Nội dung" -> "Content"
   - "Sản phẩm" -> "Products"
   - "Tổ chức hoạt động" -> "Implementation / Procedures"
   - "Hoạt động của giáo viên" -> "Teacher's Activities"
   - "Hoạt động của học sinh" -> "Students' Activities"
   - "Khởi động" -> "Warm-up"
   - "Hình thành kiến thức mới" -> "New Knowledge Formation"
   - "Luyện tập" -> "Practice"
   - "Vận dụng" -> "Application"

MẢNG JSON CẦN DỊCH:
${JSON.stringify(chunkObjects, null, 2)}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        });

        if (response.status === 429 || response.status === 403) {
          console.warn(`[Gemini API] Rate limit or Quota error on model ${model}, trying next model...`);
          continue;
        }

        if (!response.ok) {
          throw new Error(`Gemini API Error: ${response.status}`);
        }

        const data = await response.json();
        let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        textResponse = textResponse.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(textResponse);

        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item.id && item.text) {
              resultMap.set(item.id, item.text);
            }
          });
          if (resultMap.size > 0) return resultMap;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (resultMap.size === 0 && lastError) {
      console.error('All model attempts failed:', lastError);
    }
    return resultMap;
  };

  // AI Digital & AI Competency Integration Handler (QĐ 3439/QĐ-BGDĐT)
  const handleIntegrateNLSAndAI = async () => {
    setIsIntegrating(true);
    try {
      const res = await fetch('/api/integrate-nls-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: currentDoc.nodes,
          subject: currentDoc.subject,
          level: currentDoc.level,
          userApiKey: apiKey,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.integratedNodes) && data.integratedNodes.length > 0) {
          const integratedMap = new Map(data.integratedNodes.map((n: any) => [n.id, n]));
          const updatedNodes = currentDoc.nodes.map((node) => {
            const match: any = integratedMap.get(node.id);
            if (match) {
              return {
                ...node,
                contentVi: match.contentVi || node.contentVi,
                contentEn: match.contentEn || node.contentEn,
                isIntegrated: true,
                integrationType: match.integrationType || 'nls',
              };
            }
            return node;
          });
          setCurrentDoc({ ...currentDoc, nodes: updatedNodes });
          alert('Đã tự động tích hợp Năng lực số & AI theo QĐ 3439/QĐ-BGDĐT vào bài dạy!');
        } else {
          alert('AI đã phân tích: Giáo án đã được tích hợp công cụ số.');
        }
      } else {
        alert('Có lỗi khi tích hợp Năng lực số. Vui lòng kiểm tra lại kết nối hoặc API Key.');
      }
    } catch (e) {
      console.error('Integration error:', e);
      alert('Không thể kết nối dịch vụ Tích hợp Năng lực số.');
    } finally {
      setIsIntegrating(false);
    }
  };

  // Copy Bilingual Text to Clipboard
  const handleCopyToClipboard = () => {
    const textLines: string[] = [];
    currentDoc.nodes.forEach((node) => {
      if (node.type === 'table' && node.tableRows) {
        node.tableRows.forEach((r) => {
          const rowVi = r.cells.map((c) => c.contentVi).join(' | ');
          const rowEn = r.cells.map((c) => c.contentEn).filter(Boolean).join(' | ');
          textLines.push(rowVi);
          if (rowEn) textLines.push(`  (${rowEn})`);
        });
      } else {
        if (node.contentVi) textLines.push(node.contentVi);
        if (node.contentEn) textLines.push(`  ${node.contentEn}`);
      }
    });
    navigator.clipboard.writeText(textLines.join('\n'));
    alert('Đã sao chép toàn bộ nội dung giáo án song ngữ vào Clipboard!');
  };

  const mockTranslateText = (text: string): string => {
    if (!text || !text.trim()) return '';
    let clean = text.trim();

    if (/^I\.\s*MỤC TIÊU/i.test(clean)) return 'I. OBJECTIVES:';
    if (/^1\.\s*Về kiến thức/i.test(clean) || /^1\.\s*Kiến thức/i.test(clean)) return '1. Knowledge:';
    if (/^2\.\s*Về năng lực/i.test(clean) || /^2\.\s*Năng lực/i.test(clean)) return '2. Competencies:';
    if (/^3\.\s*Về phẩm chất/i.test(clean) || /^3\.\s*Phẩm chất/i.test(clean)) return '3. Qualities:';
    if (/^II\.\s*THIẾT BỊ/i.test(clean)) return 'II. TEACHING EQUIPMENT & LEARNING MATERIALS:';
    if (/^III\.\s*TIẾN TRÌNH/i.test(clean)) return 'III. TEACHING PROCEDURES / LESSON OUTLINE:';
    if (/^Hoạt động 1/i.test(clean)) return 'Activity 1: Introduction & Warm-up';
    if (/^Hoạt động 2/i.test(clean)) return 'Activity 2: Knowledge Formation';
    if (/^Hoạt động 3/i.test(clean)) return 'Activity 3: Practice & Application';
    if (/^a\)\s*Chuyển giao/i.test(clean)) return 'a) Task Assignment:';
    if (/^b\)\s*Thực hiện/i.test(clean)) return 'b) Task Execution:';
    if (/^c\)\s*Báo cáo/i.test(clean)) return 'c) Presentation & Discussion:';
    if (/^d\)\s*Kết luận/i.test(clean)) return 'd) Conclusion & Assessment:';

    return `[EN] ${clean}`;
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
              cells: r.cells.map((c) => ({ ...c, contentEn: '' })),
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

  const handleUpdateTableCell = (
    nodeId: string,
    rowId: string,
    cellId: string,
    field: 'contentVi' | 'contentEn',
    val: string
  ) => {
    const updated = currentDoc.nodes.map((n) => {
      if (n.id !== nodeId || !n.tableRows) return n;
      const newRows = n.tableRows.map((r) => {
        if (r.id !== rowId) return r;
        const newCells = r.cells.map((c) =>
          c.id === cellId ? { ...c, [field]: val } : c
        );
        return { ...r, cells: newCells };
      });
      return { ...n, tableRows: newRows };
    });
    setCurrentDoc({ ...currentDoc, nodes: updated });
  };

  return (
    <div className="app-main flex flex-col lg:flex-row gap-6">
      {/* LEFT COLUMN: SIDEBAR CONFIGURATION PANEL */}
      <aside className="settings-sidebar card w-full lg:w-80 shrink-0 space-y-6">
        <div className="card-header flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Sliders className="w-5 h-5 text-indigo-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cấu Hình Dịch Thuật</h2>
        </div>

        <div className="card-body space-y-5">
          {/* Gemini API Key Section */}
          <div className="form-group space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Gemini API Key</span>
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="text-[11px] text-red-600 dark:text-red-400 font-bold hover:underline"
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
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none pr-8"
              />
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="absolute right-2 p-1 text-slate-400 hover:text-indigo-500"
                title="Cài đặt Key"
              >
                <Key className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              {apiKey ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Đã thiết lập Key</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-bold">⚠ Chưa cài API Key</span>
              )}
            </div>
          </div>

          {/* Mode Switcher: Mock vs Gemini AI */}
          <div className="form-group space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chế độ dịch</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  translationMode === 'mock'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                onClick={() => {
                  setTranslationMode('mock');
                  handleUpdateConfig({ aiMode: 'fast' });
                }}
              >
                Chạy Thử (Mock)
              </button>

              <button
                type="button"
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  translationMode === 'ai'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                onClick={() => {
                  setTranslationMode('ai');
                  if (!apiKey) onOpenApiKeyModal();
                }}
              >
                Dịch AI (Gemini)
              </button>
            </div>
          </div>

          {/* Gemini AI Models */}
          {translationMode === 'ai' && (
            <div className="form-group space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mô hình AI</label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'gemini-3-flash-preview',
                    title: 'gemini-3-flash-preview 🚀',
                    desc: 'Frontier model 2026, tốt nhất cho reasoning & thuật ngữ.',
                  },
                  {
                    id: 'gemini-2.5-pro',
                    title: 'gemini-2.5-pro 💎',
                    desc: 'Chất lượng cao nhất cho giáo án độ dài lớn.',
                  },
                  {
                    id: 'gemini-2.5-flash',
                    title: 'gemini-2.5-flash ⚡',
                    desc: 'Cân bằng giữa tốc độ và quota tài khoản.',
                  },
                  {
                    id: 'gemini-2.5-flash-lite',
                    title: 'gemini-2.5-flash-lite 💨',
                    desc: 'Siêu nhẹ, dịch nhanh và tiết kiệm token.',
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
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold">{m.title}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{m.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject Selection */}
          <div className="form-group space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Môn học</label>
            <select
              value={currentDoc.subject}
              onChange={(e) => handleUpdateConfig({ subject: e.target.value as Subject })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
            >
              {(SUBJECTS_BY_LEVEL[currentDoc.level] || SUBJECTS_BY_LEVEL.thcs).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Level & Grade */}
          <div className="grid grid-cols-2 gap-2">
            <div className="form-group space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cấp học</label>
              <select
                value={currentDoc.level}
                onChange={(e) => {
                  const newLevel = e.target.value as EducationLevel;
                  const availableSubjects = SUBJECTS_BY_LEVEL[newLevel] || [];
                  const availableGrades = GRADES_BY_LEVEL[newLevel] || [];
                  handleUpdateConfig({
                    level: newLevel,
                    subject: availableSubjects[0]?.value || 'toan',
                    grade: availableGrades[0]?.value || 'lop1',
                  });
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              >
                <option value="mam_non">Mầm non</option>
                <option value="tieu_hoc">Tiểu học</option>
                <option value="thcs">THCS</option>
                <option value="thpt">THPT</option>
                <option value="gdtx">GDTX</option>
              </select>
            </div>

            <div className="form-group space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lớp</label>
              <select
                value={currentDoc.grade || 'lop8'}
                onChange={(e) => handleUpdateConfig({ grade: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
              >
                {(GRADES_BY_LEVEL[currentDoc.level] || GRADES_BY_LEVEL.thcs).map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Translation Tone */}
          <div className="form-group space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phong cách dịch</label>
            <select
              value={translationTone}
              onChange={(e) => setTranslationTone(e.target.value as TranslationStyleOption)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
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
        <div className="stepper card flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">1</span>
            <span>Tải giáo án gốc</span>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 mx-3" />

          <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">2</span>
            <span>Dịch & Xem trước</span>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1 mx-3" />

          <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'font-bold text-emerald-600' : 'text-slate-400'}`}>
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-xs">3</span>
            <span>Xuất file Word song ngữ</span>
          </div>
        </div>

        {/* FILE UPLOAD ZONE */}
        <div className="card p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-center">
          <div className="upload-zone border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 hover:border-blue-500 transition-colors cursor-pointer" onClick={() => document.getElementById('docx-file-input')?.click()}>
            <input
              id="docx-file-input"
              type="file"
              accept=".docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <FileUp className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nhấp hoặc kéo thả file Word (.docx) hoặc PDF bài dạy vào đây
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Bảo lưu 100% định dạng bảng biểu, công thức toán & hình ảnh
            </p>
          </div>

          {currentDoc.nodes.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{currentDoc.title}</h4>
                  <p className="text-[11px] text-slate-400">{currentDoc.nodes.length} phần tử giáo án</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>DỊCH SONG NGỮ AI</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TRANSLATION & INTEGRATION PROGRESS CARD */}
        {(isTranslating || isIntegrating || translationProgress) && (
          <div className="card p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>
                  {isIntegrating
                    ? 'AI đang phân tích và tích hợp Năng lực số & AI (QĐ 3439/QĐ-BGDĐT)...'
                    : `Đang dịch thuật giáo án song ngữ (${translationProgress?.current || 0}/${translationProgress?.total || 0} phần tử)...`}
                </span>
              </span>
              <span>{translationProgress?.pct || 0}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-blue-200 dark:bg-blue-900 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${translationProgress?.pct || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* PREVIEW PANEL */}
        {currentDoc.nodes.length > 0 && (
          <div className="card rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            {/* Action Bar Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPreviewTab('bilingual')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewTab === 'bilingual'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Bản dịch song ngữ
                </button>
                <button
                  onClick={() => setPreviewTab('source')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    previewTab === 'source'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Bản gốc tiếng Việt
                </button>
              </div>

              {/* Quick Action Tools */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onSaveToLibrary(currentDoc)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center space-x-1"
                  title="Lưu bản dịch này vào Thư viện"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu Thư viện</span>
                </button>

                <button
                  onClick={handleIntegrateNLSAndAI}
                  disabled={isIntegrating}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 border border-purple-200 dark:border-purple-800 transition-colors flex items-center space-x-1"
                  title="AI tự động tích hợp Năng lực số & AI theo QĐ 3439"
                >
                  <Zap className="w-3.5 h-3.5 text-purple-500" />
                  <span>Tích hợp NLS/AI (QĐ 3439)</span>
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition-colors flex items-center space-x-1"
                  title="Sao chép toàn bộ nội dung song ngữ"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </button>

                <button
                  onClick={() => setIsQualityOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 border border-amber-200 dark:border-amber-800 transition-colors flex items-center space-x-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Soát lỗi AI</span>
                </button>
              </div>
            </div>

            {/* Document Sheet View */}
            <div className="p-6 sm:p-8 max-h-[600px] overflow-y-auto font-['Times_New_Roman',_Times,_serif] text-[13pt] leading-relaxed space-y-3">
              {currentDoc.nodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHeader =
                  node.type === 'heading1' ||
                  node.type === 'heading2' ||
                  node.type === 'heading3' ||
                  node.type === 'title' ||
                  /^(I|II|III|IV|V|VI|VII|VIII|IX|X|\d+|[A-Z])[\.\:]\s*/i.test((node.contentVi || '').trim());

                if (node.type === 'table' && node.tableRows) {
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`my-3 p-2 rounded-xl transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-blue-500 bg-blue-50/20' : ''
                      }`}
                    >
                      <table className="w-full border-collapse border border-slate-300 dark:border-slate-700">
                        <tbody>
                          {node.tableRows.map((row) => (
                            <tr key={row.id}>
                              {row.cells.map((cell) => (
                                <td
                                  key={cell.id}
                                  className={`border border-slate-300 dark:border-slate-700 p-2.5 align-top ${
                                    cell.isHeader
                                      ? 'bg-slate-100 dark:bg-slate-800 font-bold'
                                      : ''
                                  }`}
                                >
                                  {cell.imageData && (
                                    <img
                                      src={cell.imageData}
                                      alt="Diagram"
                                      className="max-w-[220px] max-h-[160px] my-1 rounded border border-slate-200 mx-auto block"
                                    />
                                  )}
                                  <div className="text-slate-900 dark:text-slate-100">
                                    {cell.contentVi}
                                  </div>

                                  {previewTab === 'bilingual' && (
                                    <input
                                      type="text"
                                      placeholder="+ Dịch tiếng Anh..."
                                      value={cell.contentEn || ''}
                                      onChange={(e) =>
                                        handleUpdateTableCell(
                                          node.id,
                                          row.id,
                                          cell.id,
                                          'contentEn',
                                          e.target.value
                                        )
                                      }
                                      className="w-full bg-transparent italic text-[#003399] dark:text-sky-400 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 mt-1 text-[13pt]"
                                    />
                                  )}
                                </td>
                              ))}
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
                    className={`my-2 p-2 rounded-xl transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50/20' : ''
                    }`}
                  >
                    {node.imageData && (
                      <img
                        src={node.imageData}
                        alt="Illustration"
                        className="max-w-[300px] max-h-[200px] my-2 rounded border border-slate-200 mx-auto block"
                      />
                    )}
                    <div
                      className={`${
                        node.isIntegrated ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-900 dark:text-slate-100'
                      } ${isHeader ? 'font-bold' : 'font-normal'}`}
                    >
                      {node.contentVi}
                    </div>

                    {previewTab === 'bilingual' && (
                      <textarea
                        rows={Math.ceil((node.contentEn || '').length / 60) || 1}
                        placeholder="+ Tiếng Anh (Màu xanh đậm #003399, In nghiêng)..."
                        value={node.contentEn || ''}
                        onChange={(e) =>
                          handleUpdateNodeContent(node.id, 'contentEn', e.target.value)
                        }
                        className="w-full bg-transparent italic text-[#003399] dark:text-sky-400 font-normal focus:outline-none focus:ring-1 focus:ring-blue-400 rounded px-1 mt-1 text-[13pt] resize-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Action Bar */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
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

        {/* Quality Audit Modal */}
        <QualityAuditModal
          isOpen={isQualityOpen}
          onClose={() => setIsQualityOpen(false)}
          nodes={currentDoc.nodes}
        />
      </section>
    </div>
  );
};
