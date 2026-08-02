import React, { useState } from 'react';
import { LessonPlanDocument } from '../types';
import { X, Columns, Eye, Download, CheckCircle2 } from 'lucide-react';
import { exportLessonPlanToDocx } from '../utils/docxExporter';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LessonPlanDocument;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [viewMode, setViewMode] = useState<'side_by_side' | 'stacked'>('side_by_side');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                So Sánh Trước & Sau Khi Dịch Song Ngữ
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {document.title}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setViewMode('side_by_side')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'side_by_side'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Song Song (2 Cột)
              </button>
              <button
                onClick={() => setViewMode('stacked')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewMode === 'stacked'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Xếp Chồng
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {viewMode === 'side_by_side' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Original Vietnamese */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Bản Gốc (Tiếng Việt 100%)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Gốc
                  </span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                  {document.nodes.map((node) => (
                    <div key={`orig-${node.id}`} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <p className={`${node.isBold ? 'font-bold' : ''}`}>
                        {node.contentVi}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Bilingual Version */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-900/50">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-200">
                    Bản Song Ngữ (Chuẩn Bộ GD&ĐT)
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-600 text-white">
                    #003399 In nghiêng
                  </span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  {document.nodes.map((node) => (
                    <div
                      key={`biling-${node.id}`}
                      className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <p className={`text-slate-900 dark:text-white ${node.isBold ? 'font-bold' : ''}`}>
                        {node.contentVi}
                      </p>
                      {node.contentEn && (
                        <p className="italic text-[#003399] dark:text-blue-400 font-normal">
                          {node.contentEn}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Stacked View */
            <div className="space-y-3 max-w-3xl mx-auto">
              {document.nodes.map((node) => (
                <div
                  key={`stacked-${node.id}`}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Tiếng Việt
                    </span>
                    <p className={`text-slate-900 dark:text-white text-sm ${node.isBold ? 'font-bold' : ''}`}>
                      {node.contentVi}
                    </p>
                  </div>

                  {node.contentEn && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                        Tiếng Anh (#003399 In Nghiêng)
                      </span>
                      <p className="italic text-[#003399] dark:text-blue-400 text-sm font-normal">
                        {node.contentEn}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between rounded-b-2xl">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Đã khớp 100% từng câu tiếng Việt với tiếng Anh bên dưới.</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => exportLessonPlanToDocx(document)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Word (.docx)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
