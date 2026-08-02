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
} from 'lucide-react';

interface EditorViewProps {
  currentDoc: LessonPlanDocument;
  setCurrentDoc: React.Dispatch<React.SetStateAction<LessonPlanDocument>>;
  onSaveToLibrary: (doc: LessonPlanDocument) => void;
  onOpenApiKeyModal: () => void;
}

const SETTINGS_KEY = 'user_khbd_settings_v2';
const API_KEY_STORAGE = 'gemini_api_key_v1';

export const EditorView: React.FC<EditorViewProps> = ({
  currentDoc,
  setCurrentDoc,
  onSaveToLibrary,
  onOpenApiKeyModal,
}) => {
  // Config state
  const [translationMode, setTranslationMode] = useState<TranslationMode>('ai');
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

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isQualityOpen, setIsQualityOpen] = useState(false);
  const [qualityReport, setQualityReport] = useState<QualityCheckReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [previewTab, setPreviewTab] = useState<'source' | 'bilingual'>('bilingual');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Load saved configuration from localStorage
  useEffect(() => {
    try {
      const savedKey = loadSavedApiKey();
      setApiKey(savedKey);

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

  // Update doc & save to localStorage
  const handleUpdateConfig = (updates: Partial<LessonPlanDocument>) => {
    const updatedDoc = { ...currentDoc, ...updates };
    setCurrentDoc(updatedDoc);

    try {
      const configToSave = {
        level: updatedDoc.level,
        subject: updatedDoc.subject,
        grade: updatedDoc.grade,
        bilingualStyle,
        translationTone,
        translationMode,
        selectedModel,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(configToSave));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsTranslating(true);
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
    } catch (error) {
      console.error('File parse error:', error);
      alert('Không thể đọc tệp Word. Vui lòng kiểm tra lại định dạng tệp .docx.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Perform Translation
  const performTranslation = async (targetNodes: PlanNode[]) => {
    if (translationMode === 'ai' && !apiKey) {
      onOpenApiKeyModal();
      return;
    }

    setIsTranslating(true);
    setCurrentStep(2);
    setTranslationProgress({ current: 0, total: 1, pct: 0 });

    try {
      const itemsToTranslate: { id: string; text: string }[] = [];
      targetNodes.forEach((node) => {
        if (node.type === 'table' && node.tableRows) {
          node.tableRows.forEach((row) => {
            row.cells.forEach((cell) => {
              itemsToTranslate.push({ id: cell.id, text: cell.contentVi });
            });
          });
        } else {
          itemsToTranslate.push({ id: node.id, text: node.contentVi });
        }
      });

      if (itemsToTranslate.length === 0) {
        setIsTranslating(false);
        setTranslationProgress(null);
        return;
      }

      setTranslationProgress({ current: 0, total: itemsToTranslate.length, pct: 0 });

      const BATCH_SIZE = 15;
      const translationsMap = new Map<string, string>();

      for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
        const chunk = itemsToTranslate.slice(i, i + BATCH_SIZE);
        const chunkTexts = chunk.map((c) => c.text);

        let chunkTrans: string[] = [];

        if (translationMode === 'mock') {
          // Mock mode: generate clear English text directly
          await new Promise((r) => setTimeout(r, 600));
          chunkTrans = chunkTexts.map((text) => mockTranslateText(text));
        } else {
          // Real Gemini API via server or client API key
          try {
            const res = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: chunkTexts,
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
              chunkTrans = data.translations || [];
            } else {
              chunkTrans = chunkTexts.map((t) => mockTranslateText(t));
            }
          } catch (e) {
            chunkTrans = chunkTexts.map((t) => mockTranslateText(t));
          }
        }

        chunk.forEach((item, idx) => {
          translationsMap.set(item.id, chunkTrans[idx] || item.text);
        });

        // Live progressive state update
        const liveNodes = currentDoc.nodes.map((node) => {
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

        const currentDone = Math.min(itemsToTranslate.length, i + BATCH_SIZE);
        const pct = Math.round((currentDone / itemsToTranslate.length) * 100);

        setCurrentDoc((prev) => ({
          ...prev,
          nodes: liveNodes,
          updatedAt: new Date().toISOString(),
        }));

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

  // Mock translation helper
  const mockTranslateText = (text: string): string => {
    if (!text || !text.trim()) return '';
    const clean = text.trim();
    if (/^I\.\s*MỤC TIÊU/i.test(clean)) return 'I. OBJECTIVES:';
    if (/^1\.\s*Kiến thức/i.test(clean)) return '1. Knowledge:';
    if (/^2\.\s*Về năng lực/i.test(clean)) return '2. Competencies:';
    if (/^2\.1\.\s*Năng lực chung/i.test(clean)) return '2.1. General Competencies:';
    if (/^3\.\s*Về phẩm chất/i.test(clean)) return '3. Character Attributes / Qualities:';
    if (/^II\.\s*THIẾT BỊ DẠY HỌC/i.test(clean)) return 'II. TEACHING EQUIPMENT AND MATERIALS:';
    if (/^III\.\s*TIẾN TRÌNH DẠY HỌC/i.test(clean)) return 'III. LESSON PROCEDURES:';
    if (/^A\.\s*HOẠT ĐỘNG MỞ ĐẦU/i.test(clean)) return 'A. WARM-UP / INTRODUCTION ACTIVITY:';
    if (/^B\.\s*HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC/i.test(clean)) return 'B. NEW KNOWLEDGE FORMATION ACTIVITY:';
    if (/^C\.\s*HOẠT ĐỘNG LUYỆN TẬP/i.test(clean)) return 'C. PRACTICE ACTIVITY:';
    if (/^D\.\s*HOẠT ĐỘNG VẬN DỤNG/i.test(clean)) return 'D. APPLICATION ACTIVITY:';
    if (/a\.\s*Mục tiêu/i.test(clean)) return 'a. Objectives:';
    if (/b\.\s*Nội dung/i.test(clean)) return 'b. Content:';
    if (/c\.\s*Sản phẩm/i.test(clean)) return 'c. Expected Products:';
    if (/d\.\s*Tổ chức thực hiện/i.test(clean)) return 'd. Implementation / Execution:';

    // Pedagogical dictionary for mock mode (pure English only, no Vietnamese repetition)
    const mockDict: { [key: string]: string } = {
      'ôn tập': 'Review and consolidation of knowledge',
      'củng cố': 'Consolidate knowledge and systemize core concepts',
      'tự chủ': 'Self-reliance and self-learning skills',
      'giao tiếp': 'Communication and collaboration competencies',
      'giải quyết': 'Problem solving and creativity skills',
      'nhân ái': 'Compassion and willingness to help peers',
      'chăm chỉ': 'Diligence and active participation in learning tasks',
      'trung thực': 'Honesty and objective self-assessment',
      'trách nhiệm': 'Responsibility in completing learning activities',
    };

    const lower = clean.toLowerCase();
    for (const [key, val] of Object.entries(mockDict)) {
      if (lower.includes(key)) {
        return val;
      }
    }

    return 'Students perform the assigned learning tasks, discuss in groups, and record their findings in the worksheet.';
  };

  const handleTranslateAll = () => performTranslation(currentDoc.nodes);

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

  // Update node text
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
    <div className="app-main">
      {/* LEFT COLUMN: SIDEBAR CONFIGURATION PANEL */}
      <aside className="settings-sidebar card">
        <div className="card-header">
          <Sliders className="w-5 h-5 text-indigo-500" />
          <h2>Cấu Hình Dịch Thuật</h2>
        </div>

        <div className="card-body">
          {/* Gemini API Key Section */}
          <div className="form-group">
            <label>
              <span>Gemini API Key</span>
              <span className="tooltip" data-tooltip="Khóa API lưu an toàn trên trình duyệt của bạn.">
                <HelpCircle className="w-4 h-4 text-slate-400 inline" />
              </span>
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
                placeholder="Nhập API Key (AIzaSy... hoặc AQ...)"
                className="form-input pr-9"
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

            <div className="flex items-center justify-between text-xs mt-1">
              {apiKey ? (
                <span className="badge badge-success">Đã thiết lập</span>
              ) : (
                <span className="badge badge-warning">Chưa thiết lập</span>
              )}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="link-small flex items-center gap-1"
              >
                Lấy Key miễn phí <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Mode Switcher: Mock vs Gemini AI */}
          <div className="form-group">
            <label>Chế độ dịch</label>
            <div className="radio-group-toggle">
              <label
                className={`radio-toggle-label ${
                  translationMode === 'mock' ? 'active' : ''
                }`}
                onClick={() => {
                  setTranslationMode('mock');
                  handleUpdateConfig({ aiMode: 'fast' });
                }}
              >
                <span>Chạy Thử (Mock)</span>
              </label>

              <label
                className={`radio-toggle-label ${
                  translationMode === 'ai' ? 'active' : ''
                }`}
                onClick={() => {
                  setTranslationMode('ai');
                  if (!apiKey) onOpenApiKeyModal();
                }}
              >
                <span>Dịch AI (Gemini)</span>
              </label>
            </div>
          </div>

          {/* Gemini AI Models (Shown in AI mode) */}
          {translationMode === 'ai' && (
            <div className="form-group">
              <label>Mô hình AI</label>
              <div className="space-y-2">
                {[
                  {
                    id: 'gemini-2.5-flash',
                    title: 'gemini-2.5-flash ⚡',
                    desc: 'Cân bằng tối ưu giữa chi phí và tốc độ dịch thuật.',
                  },
                  {
                    id: 'gemini-2.5-pro',
                    title: 'gemini-2.5-pro 💎',
                    desc: 'Chất lượng dịch thuật chuyên sâu tốt nhất cho sư phạm.',
                  },
                  {
                    id: 'gemini-1.5-flash',
                    title: 'gemini-1.5-flash 💨',
                    desc: 'Siêu nhẹ, dịch cực nhanh.',
                  },
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`radio-card ${selectedModel === m.id ? 'active' : ''}`}
                  >
                    <div className="radio-card-dot" />
                    <div className="radio-card-content">
                      <div className="radio-title">{m.title}</div>
                      <div className="radio-desc">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject Selection */}
          <div className="form-group">
            <label>Môn học</label>
            <select
              value={currentDoc.subject}
              onChange={(e) =>
                handleUpdateConfig({ subject: e.target.value as Subject })
              }
              className="form-select"
            >
              {(SUBJECTS_BY_LEVEL[currentDoc.level] || SUBJECTS_BY_LEVEL.thcs).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Level & Grade */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Cấp học</label>
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
                className="form-select"
              >
                <option value="mam_non">Mầm non</option>
                <option value="tieu_hoc">Tiểu học</option>
                <option value="thcs">THCS</option>
                <option value="thpt">THPT</option>
                <option value="gdtx">GDTX</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label>Lớp</label>
              <select
                value={currentDoc.grade || 'lop8'}
                onChange={(e) => handleUpdateConfig({ grade: e.target.value })}
                className="form-select"
              >
                {(GRADES_BY_LEVEL[currentDoc.level] || GRADES_BY_LEVEL.thcs).map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bilingual Layout Style */}
          <div className="form-group">
            <label>Kiểu hiển thị song ngữ</label>
            <div className="space-y-2">
              {[
                {
                  id: 'parallel',
                  title: 'Đoạn song song (Kiểu 1)',
                  desc: 'Mỗi đoạn tiếng Việt ở trên, bản dịch tiếng Anh in nghiêng nằm ngay bên dưới.',
                },
                {
                  id: 'two_column',
                  title: 'Bảng 2 cột (Kiểu 2)',
                  desc: 'Chuyển toàn bộ nội dung giáo án thành bảng 2 cột: Trái tiếng Việt - Phải tiếng Anh.',
                },
                {
                  id: 'section',
                  title: 'Theo mục lớn (Kiểu 3)',
                  desc: 'Giữ nguyên giáo án tiếng Việt, chèn thêm bản tiếng Anh ngay sau mỗi phần chính.',
                },
              ].map((styleOpt) => (
                <div
                  key={styleOpt.id}
                  onClick={() => {
                    setBilingualStyle(styleOpt.id as BilingualStyle);
                    handleUpdateConfig({});
                  }}
                  className={`radio-card ${
                    bilingualStyle === styleOpt.id ? 'active' : ''
                  }`}
                >
                  <div className="radio-card-dot" />
                  <div className="radio-card-content">
                    <div className="radio-title">{styleOpt.title}</div>
                    <div className="radio-desc">{styleOpt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Translation Tone */}
          <div className="form-group">
            <label>Phong cách dịch thuật</label>
            <select
              value={translationTone}
              onChange={(e) =>
                setTranslationTone(e.target.value as TranslationStyleOption)
              }
              className="form-select"
            >
              <option value="academic">Dịch sát chuyên ngành (Khuyên dùng)</option>
              <option value="simple">Dễ hiểu cho học sinh (Từ vựng đơn giản)</option>
              <option value="formal">Trang trọng (Thích hợp báo cáo, hội thảo)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* RIGHT COLUMN: MAIN CONTENT & PREVIEW */}
      <section className="content-area">
        {/* STEPPER */}
        <div className="stepper card">
          <div className={`step-item ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Tải giáo án gốc</span>
          </div>

          <div className="step-line" />

          <div className={`step-item ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Dịch & Xem trước</span>
          </div>

          <div className="step-line" />

          <div className={`step-item ${currentStep >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Tải file song ngữ</span>
          </div>
        </div>

        {/* FILE UPLOAD ZONE */}
        <div className="card p-8 text-center space-y-4">
          <div className="upload-zone" onClick={() => document.getElementById('docx-file-input')?.click()}>
            <input
              id="docx-file-input"
              type="file"
              accept=".docx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500 mx-auto">
              <FileUp className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Kéo thả hoặc nhấp để chọn file giáo án Word (.docx)
            </h3>
            <p className="text-xs text-slate-400">
              Chấp nhận định dạng Word .docx — Tự động bảo lưu 100% độ rộng cột, bảng & công thức toán
            </p>
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all inline-flex items-center space-x-2"
            >
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <span>Chọn file từ máy tính</span>
            </button>
          </div>

          {currentDoc.nodes.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <FileText className="w-6 h-6 text-indigo-500" />
                <div className="text-left">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {currentDoc.title}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {currentDoc.nodes.length} đoạn / phần tử giáo án
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>TẠO GIÁO ÁN SONG NGỮ</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TRANSLATION PROGRESS CARD */}
        {(isTranslating || translationProgress) && (
          <div className="card p-6 space-y-3 bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-spin" />
                <span>
                  Đang dịch thuật giáo án song ngữ ({translationProgress?.current || 0}/{translationProgress?.total || 0} phần tử)...
                </span>
              </span>
              <span>{translationProgress?.pct || 0}%</span>
            </div>

            <div className="progress-bar-wrapper">
              <div
                className="progress-bar-fill"
                style={{ width: `${translationProgress?.pct || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* PREVIEW PANEL */}
        {currentDoc.nodes.length > 0 && (
          <div className="card flex flex-col overflow-hidden">
            {/* Preview Header & Tabs */}
            <div className="preview-header border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xem Trước Giáo Án
                </h2>
              </div>

              <div className="preview-tabs">
                <button
                  onClick={() => setPreviewTab('source')}
                  className={`tab-btn ${previewTab === 'source' ? 'active' : ''}`}
                >
                  Bản gốc (Tiếng Việt)
                </button>

                <button
                  onClick={() => setPreviewTab('bilingual')}
                  className={`tab-btn ${previewTab === 'bilingual' ? 'active' : ''}`}
                >
                  Bản dịch song ngữ
                </button>
              </div>
            </div>

            {/* Document Sheet View */}
            <div className="preview-pane-wrapper">
              <div className="document-container">
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
                          isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''
                        }`}
                      >
                        <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-[13pt] font-['Times_New_Roman',_Times,_serif]">
                          <tbody>
                            {node.tableRows.map((row) => (
                              <tr key={row.id}>
                                {row.cells.map((cell) => (
                                  <td
                                    key={cell.id}
                                    className={`border border-slate-300 dark:border-slate-700 p-2.5 vertical-top ${
                                      cell.isHeader
                                        ? 'bg-slate-100 dark:bg-slate-800 font-bold'
                                        : ''
                                    }`}
                                  >
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
                                        className="w-full bg-transparent italic text-[#003399] dark:text-sky-400 font-normal focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 mt-1 text-[13pt] font-['Times_New_Roman',_Times,_serif]"
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

                  // Heading or Paragraph lines: No parentheses! Just Vietnamese line above, English line below in deep blue italic
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`my-2 p-2 rounded-xl transition-all cursor-pointer ${
                        isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''
                      }`}
                    >
                      <div
                        className={`text-slate-900 dark:text-slate-100 text-[13pt] font-['Times_New_Roman',_Times,_serif] ${
                          isHeader ? 'font-bold' : 'font-normal'
                        }`}
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
                          className="w-full bg-transparent italic text-[#003399] dark:text-sky-400 font-normal focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 mt-1 text-[13pt] font-['Times_New_Roman',_Times,_serif] resize-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="preview-actions">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5"
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

        {/* WARNING & TIPS CARD */}
        <div className="card alert-card card-warning p-6 space-y-3">
          <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <h3>Lưu ý quan trọng cho Giáo viên</h3>
          </div>

          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc pl-5 leading-relaxed">
            <li>
              <strong>Kiểm duyệt bản dịch:</strong> Bản dịch do trí tuệ nhân tạo (AI) thực hiện chỉ mang tính chất hỗ trợ chuyên môn. Kính mong thầy/cô duyệt lại toàn bộ thuật ngữ chuyên ngành trước khi sử dụng giảng dạy chính thức.
            </li>
            <li>
              <strong>Giới hạn định dạng:</strong> Các bảng biểu, công thức toán học nâng cao dạng Word Equation hoặc các hình vẽ tự tạo (Shapes) có thể sẽ được đơn giản hóa để giữ nguyên cấu trúc văn bản.
            </li>
            <li>
              <strong>Không lưu trữ dữ liệu:</strong> Ứng dụng chạy trực tiếp trên trình duyệt của thầy/cô. Chúng tôi không lưu trữ bất kỳ file hoặc dữ liệu cá nhân nào trên máy chủ nhằm đảm bảo quyền riêng tư.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
};
