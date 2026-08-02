import React from 'react';
import { LessonPlanDocument, NavTab } from '../types';
import { History, FileText, Download, ArrowRight, Trash2, Calendar, Award } from 'lucide-react';
import { exportLessonPlanToDocx } from '../utils/docxExporter';

interface HistoryViewProps {
  historyList: LessonPlanDocument[];
  onOpenDoc: (doc: LessonPlanDocument) => void;
  onClearHistory: () => void;
  setActiveTab: (tab: NavTab) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyList,
  onOpenDoc,
  onClearHistory,
  setActiveTab,
}) => {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Lịch Sử Dịch & Chuyển Đổi Kế Hoạch Bài Dạy (KHBD)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhật ký các Kế hoạch bài dạy đã được xử lý song ngữ bởi AI LessonPlan Bilingual Pro
            </p>
          </div>
        </div>

        {historyList.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa lịch sử</span>
          </button>
        )}
      </div>

      {historyList.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
            Chưa có lịch sử chuyển đổi nào
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Khi bạn tải Kế hoạch bài dạy lên hoặc dịch song ngữ, phiên bản làm việc sẽ được tự động lưu lại tại đây.
          </p>
          <button
            onClick={() => setActiveTab('editor')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors"
          >
            Tạo KHBD đầu tiên ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {historyList.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                    {doc.level.toUpperCase()} • {doc.subject.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(doc.updatedAt).toLocaleDateString('vi-VN')}</span>
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {doc.nodes.length} phần tử • {doc.pageCount || 1} trang • Chuẩn {doc.alignmentMode}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onOpenDoc(doc)}
                  className="flex items-center space-x-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Mở chỉnh sửa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => exportLessonPlanToDocx(doc)}
                  className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  title="Xuất Word (.docx)"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
