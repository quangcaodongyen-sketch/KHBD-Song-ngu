import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, ExternalLink, ShieldCheck, Zap, X, Check } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  onMockMode: () => void;
  currentKey: string;
}

const API_KEY_STORAGE = 'gemini_api_key_v1';

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

  useEffect(() => {
    if (isOpen) {
      setKeyInput(currentKey || '');
      setIsSaved(!!currentKey);
    }
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      alert('Vui lòng nhập Gemini API Key!');
      return;
    }
    try {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
    } catch {}
    onSave(trimmed);
    setIsSaved(true);
  };

  const handleMock = () => {
    onMockMode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header icon */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Cấu Hình API Key Bắt Buộc
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Ứng dụng yêu cầu <strong className="text-blue-600 dark:text-blue-400">Gemini API Key</strong> để thực hiện dịch thuật AI. Bạn có thể lấy khóa miễn phí từ tài khoản Google của mình.
          </p>

          {/* API Key Input */}
          <div className="space-y-2 mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Nhập Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  setIsSaved(false);
                }}
                placeholder="AIzaSy... (dán API Key tại đây)"
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                title={showKey ? 'Ẩn API Key' : 'Hiện API Key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Status & Link row */}
          <div className="flex items-center justify-between mb-5">
            {isSaved && currentKey ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                <Check className="w-3 h-3" />
                <span>Đã thiết lập</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400">Chưa cài đặt API Key</span>
            )}

            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Lấy Key miễn phí</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Security note */}
          <div className="flex items-start space-x-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Lưu ý:</strong> Khóa được lưu trữ, bảo vệ trình duyệt (LocalStorage) của bạn, đảm bảo tính bảo mật và quyền riêng tư tuyệt đối cho giáo án.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleMock}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Chạy thử (Mock Mode)</span>
            </button>

            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors shadow-md shadow-blue-600/25"
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

// Helper to load saved API key from localStorage
export function loadSavedApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}
