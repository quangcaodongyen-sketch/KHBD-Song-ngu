import React from 'react';
import { QualityCheckReport } from '../types';
import { ShieldCheck, AlertTriangle, CheckCircle2, X, Wrench, Sparkles } from 'lucide-react';

interface QualityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityCheckReport | null;
  isLoading: boolean;
  onAutoFix: () => void;
}

export const QualityAuditModal: React.FC<QualityAuditModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
  onAutoFix,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Kiểm Tra & Kiểm Định Chất Lượng AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động soát lỗi dịch, thuật ngữ GDPT 2018, chính tả & quy định định dạng
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                AI đang rà soát từng dòng Kế hoạch bài dạy song ngữ...
              </p>
              <p className="text-xs text-slate-400">
                Kiểm tra độ rộng cột, khoá công thức/hình ảnh, thuật ngữ Công văn 5512 & định dạng xanh #003399.
              </p>
            </div>
          ) : report ? (
            <>
              {/* Score Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900/90 to-teal-900/90 text-white flex items-center justify-between shadow-lg">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                    Điểm Đánh Giá Chất Lượng
                  </span>
                  <p className="text-xs text-emerald-100/90 leading-relaxed max-w-md">
                    {report.summary}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-extrabold text-emerald-300">
                    {report.score}%
                  </span>
                  <span className="block text-[11px] text-emerald-200">Đạt Chuẩn Bộ GD&ĐT</span>
                </div>
              </div>

              {/* Checklist breakdown */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Tiêu Chí Rà Soát Tự Động:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Màu chữ tiếng Anh: RGB(0,51,153) #003399</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Kiểu chữ: In nghiêng, không bold</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Khoá 100% Độ rộng cột bảng biểu</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Khoá 100% Hình ảnh, Hình vẽ & Công thức MathType</span>
                  </div>
                </div>
              </div>

              {/* Issues / Findings List */}
              {report.issues && report.issues.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Phát Hiện ({report.issues.length} điểm cần lưu ý):</span>
                  </h4>

                  <div className="space-y-2">
                    {report.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs space-y-1"
                      >
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          • {issue.description}
                        </p>
                        <p className="text-amber-700 dark:text-amber-300">
                          Gợi ý: {issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    Tuyệt vời! Không phát hiện bất kỳ lỗi chính tả, thuật ngữ hay sai lệch định dạng nào.
                  </span>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>

          {report && report.issues && report.issues.length > 0 && (
            <button
              onClick={onAutoFix}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Wrench className="w-4 h-4" />
              <span>Tự Động Sửa Tất Cả Lỗi Phát Hiện</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
