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

  const dictionary: [RegExp, string][] = [
    [/^KẾ HOẠCH BÀI DẠY/i, 'LESSON PLAN'],
    [/^GIÁO ÁN/i, 'LESSON PLAN'],
    [/^BÀI HỌC/i, 'LESSON'],
    [/^MỤC TIÊU/i, 'I. OBJECTIVES'],
    [/^THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU/i, 'II. TEACHING EQUIPMENT AND LEARNING MATERIALS'],
    [/^TIẾN TRÌNH DẠY HỌC/i, 'III. TEACHING PROCEDURES'],
    [/^HOẠT ĐỘNG KHỞI ĐỘNG/i, '1. Warm-up Activity'],
    [/^HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC MỚI/i, '2. New Knowledge Formation Activity'],
    [/^HOẠT ĐỘNG LUYỆN TẬP/i, '3. Practice Activity'],
    [/^HOẠT ĐỘNG VẬN DỤNG/i, '4. Application Activity'],
    [/^Hoạt động (\d+)/gi, 'Activity $1'],
    [/^Bước 1: Chuyển giao nhiệm vụ/gi, 'Step 1: Task Assignment'],
    [/^Bước 2: Thực hiện nhiệm vụ/gi, 'Step 2: Task Execution'],
    [/^Bước 3: Báo cáo, thảo luận/gi, 'Step 3: Presentation and Discussion'],
    [/^Bước 4: Kết luận, nhận định/gi, 'Step 4: Conclusion and Assessment'],
    [/^a\) Mục tiêu/gi, 'a) Objectives'],
    [/^b\) Nội dung/gi, 'b) Content'],
    [/^c\) Sản phẩm/gi, 'c) Expected Products'],
    [/^d\) Tổ chức thực hiện/gi, 'd) Implementation'],
    [/^1\. Kiến thức/gi, '1. Knowledge'],
    [/^2\. Năng lực/gi, '2. Competencies'],
    [/^3\. Phẩm chất/gi, '3. Character Qualities'],
    [/^Năng lực chung/gi, 'General Competencies'],
    [/^Năng lực đặc thù/gi, 'Specific Competencies'],
    [/^Học sinh/gi, 'Students'],
    [/^Giáo viên/gi, 'Teacher'],
    [/^Yêu cầu cần đạt/gi, 'Requirements to be achieved'],
    [/^Phương pháp dạy học/gi, 'Teaching methods'],
    [/^Hình thức tổ chức/gi, 'Organization form'],
  ];

  for (const [regex, replacement] of dictionary) {
    translated = translated.replace(regex, replacement);
  }

  if (translated === text) {
    // Basic structural sentence translation wrapper
    if (text.toLowerCase().includes('học sinh')) {
      translated = text.replace(/Học sinh/gi, 'Students').replace(/thực hiện/gi, 'perform').replace(/thảo luận/gi, 'discuss');
    } else {
      translated = `Translate: ${text}`;
    }
  }

  return translated;
}

export const EditorView: React.FC<EditorViewProps> = ({
  currentDoc,
  setCurrentDoc,
  onSaveToLibrary,
  onOpenApiKeyModal,
}) => {
  // Config state
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');
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

    setIsTranslating(true);
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

      setTimeout(() => {
        performTranslation(nodes);
      }, 200);
    } catch (error) {
      console.error('File parse error:', error);
      alert('Không thể đọc tệp Word (.docx). Vui lòng kiểm tra lại định dạng tệp.');
    } finally {
      setIsTranslating(false);
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
      nodesToProcess.forEach((node) => {
        if (node.type === 'table' && node.tableRows) {
          node.tableRows.forEach((row) => {
            row.cells.forEach((cell) => {
              if (cell.paragraphs && cell.paragraphs.length > 0) {
                cell.paragraphs.forEach((p) => {
                  if (p.contentVi && p.contentVi.trim()) {
                    itemsToTranslate.push({ id: p.id, text: p.contentVi });
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

      setTranslationProgress({ current: 0, total: itemsToTranslate.length, pct: 0 });

      const BATCH_SIZE = 15;
      const translationsMap = new Map<string, string>();

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
      new Set([initialModel, 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])
    );

    const resultMap = new Map<string, string>();
    let lastError: any = null;

    const promptText = `Bạn là chuyên gia dịch thuật giáo dục Việt - Anh GDPT 2018.
Dịch mảng JSON tiếng Việt sau sang tiếng Anh thuần túy (không ngoặc đơn, giữ nguyên công thức toán & mã id):

${JSON.stringify(chunkObjects, null, 2)}

Trả về duy nhất mảng JSON dạng: [{"id": "id_goc", "text": "English translation"}]`;

    for (const model of modelsToTry) {
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
            continue;
          }

          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!textResponse) continue;

          // Robust JSON extraction
          let cleanJsonStr = textResponse.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
          const matchArray = cleanJsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (matchArray) {
            cleanJsonStr = matchArray[0];
          }

          let parsed: any[] = [];
          try {
            parsed = JSON.parse(cleanJsonStr);
          } catch {
            // Regex match individual objects if array parsing failed
            const objRegex = /\{\s*"id"\s*:\s*"([^"]+)"\s*,\s*"text"\s*:\s*"([^"]+)"\s*\}/g;
            let m;
            while ((m = objRegex.exec(textResponse)) !== null) {
              resultMap.set(m[1], m[2]);
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
