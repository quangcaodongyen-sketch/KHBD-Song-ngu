import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, ExternalLink, ShieldCheck, Zap, X, Check, Cpu } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, selectedModel?: string) => void;
  onMockMode: () => void;
  currentKey: string;
}

const API_KEY_STORAGE = 'gemini_api_key_v1';
const SELECTED_MODEL_STORAGE = 'gemini_selected_model_v1';

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onMockMode,
  currentKey,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');

  useEffect(() => {
    if (isOpen) {
      setKeyInput(currentKey || '');
      setIsSaved(!!currentKey);
      const savedModel = localStorage.getItem(SELECTED_MODEL_STORAGE);
      if (savedModel) setSelectedModel(savedModel);
    }
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      alert('Vui lòng nhập Gemini API Key để tiếp tục sử dụng AI!');
      return;
    }
    try {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
      localStorage.setItem(SELECTED_MODEL_STORAGE, selectedModel);
    } catch {}
    onSave(trimmed, selectedModel);
    setIsSaved(true);
  };

  const handleMock = () => {
    onMockMode();
    onClose();
  };

  const modelsList = [
    {
      id: 'gemini-3-flash-preview',
      name: 'gemini-3-flash-preview (Mặc định)',
      tag: 'Khuyên Dùng 🚀',
      desc: 'Frontier-class model mới nhất 2026, khả năng suy luận & dịch thuật chuyên môn cao vượt trội.',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'gemini-2.5-pro',
      tag: 'Chuyên Sâu 💎',
      desc: 'Dành cho giáo án độ dài lớn hoặc tác vụ dịch thuật cấu trúc phức tạp.',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'gemini-2.5-flash',
      tag: 'Cân Bằng ⚡',
      desc: 'Tốc độ nhanh, ổn định và tối ưu quota tài khoản miễn phí.',
    },
    {
      id: 'gemini-2.5-flash-lite',
      name: 'gemini-2.5-flash-lite',
      tag: 'Siêu Tốc 💨',
      desc: 'Mô hình siêu nhẹ, tốc độ dịch thuật cực nhanh.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in max-h-[90vh] flex flex-col">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
          {/* Header icon */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cấu Hình Model AI & API Key Gemini
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nhập API Key cá nhân để dịch thuật tự động không giới hạn
              </p>
            </div>
          </div>

          {/* Model Selection Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Chọn Mô Hình AI Dịch Thuật</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {modelsList.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-xs font-bold truncate">{m.name}</h4>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 shrink-0">
                          {m.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {m.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nhập Gemini API Key
              </label>

              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
              >
                <span>🔑 Lấy API Key miễn phí tại đây</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="AIzaSy... (dán API Key của bạn vào đây)"
                className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                title={showKey ? 'Ẩn API Key' : 'Hiện API Key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Status & Quota Instruction */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-1 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold flex items-center space-x-1">
              <span>💡 Hướng dẫn khi gặp lỗi hết Quota lượt dùng:</span>
            </p>
            <p className="leading-relaxed text-[11px]">
              Tài khoản Google miễn phí cho phép gọi 15 lượt/phút. Nếu thông báo hết quota, thầy cô chỉ cần mở tab ẩn danh hoặc vào <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline font-bold text-red-600 dark:text-red-400">Google AI Studio (api-keys)</a> bằng một tài khoản Gmail khác, tạo key mới và dán vào đây để tiếp tục sử dụng ngay.
            </p>
          </div>

          {/* Security note */}
          <div className="flex items-start space-x-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Bảo mật:</strong> API Key được lưu trực tiếp tại trình duyệt (LocalStorage) của thiết bị cá nhân, không gửi về server trung gian.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleMock}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Dùng Chế độ Chạy thử</span>
            </button>

            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-lg shadow-blue-600/25"
            >
              <Check className="w-4 h-4" />
              <span>Xác Nhận & Lưu Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function loadSavedApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}
