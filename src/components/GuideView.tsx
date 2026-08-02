import React from 'react';
import { HelpCircle, BookOpen, CheckCircle, FileText, Award, Layers, Sparkles } from 'lucide-react';

export const GuideView: React.FC = () => {
  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-xl space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-semibold text-blue-200">
          <Award className="w-4 h-4 text-amber-300" />
          <span>Hướng Dẫn Dành Cho Giáo Viên</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Hướng Dẫn Soạn Kế Hoạch Bài Dạy Song Ngữ Chuẩn Bộ GD&ĐT
        </h1>
        <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
          Tìm hiểu quy trình 4 bước tạo Kế hoạch bài dạy (KHBD) song ngữ Việt - Anh đúng chuẩn Công văn 5512, Chương trình GDPT 2018 và quy định màu sắc #003399.
        </p>
      </div>

      {/* Step by Step Guide */}
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
              1
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Bước 1: Tải Kế Hoạch Bài Dạy Gốc (.docx hoặc .pdf)
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-11">
            Nhấn nút <strong>"Tải file Word (.docx) / PDF lên"</strong> ở thanh công cụ chính để tải bài dạy tiếng Việt của thầy cô lên. Hệ thống tự động khoá hình ảnh, công thức và độ rộng cột.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
              2
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Bước 2: Chọn Chế Độ Căn Chỉnh & Chế Độ AI
            </h3>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-11 space-y-2">
            <p>Tùy vào quy định của trường hoặc Phòng/Sở GD&ĐT, thầy cô lựa chọn:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>□ Giữ nguyên bản KHBD gốc:</strong> Giữ nguyên 100% định dạng & độ rộng cột, chỉ chèn dòng tiếng Anh bên dưới.</li>
              <li><strong>□ Chuẩn theo Công văn 5512:</strong> Tự động cấu trúc lại theo 4 hoạt động chuẩn (Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện với 4 bước).</li>
              <li><strong>Chế độ AI "Chính xác nhất":</strong> Đối chiếu thuật ngữ học thuật GDPT 2018, Cambridge và CEFR.</li>
            </ul>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
              3
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Bước 3: Thực Hiện Dịch & Soát Lỗi
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-11">
            Sử dụng các nút công cụ <strong>"✓ Dịch toàn bộ"</strong>, <strong>"✓ Dịch bảng"</strong>, <strong>"✓ Dịch phần chọn"</strong>. Sau khi dịch xong, có thể nhấn <strong>"✓ Kiểm tra chất lượng"</strong> để AI tự động kiểm tra lỗi chính tả, lỗi font hoặc lỗi thuật ngữ.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
              4
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Bước 4: Xuất File Word (.docx) Hoàn Chỉnh
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-11">
            Nhấn <strong>"Xuất Word (.docx)"</strong>. File Word xuất ra đảm bảo 100% phần tiếng Anh có màu xanh <strong className="text-blue-700">#003399</strong>, in nghiêng, giữ nguyên cỡ chữ gốc và cấu trúc bảng biểu, hình ảnh.
          </p>
        </div>
      </div>
    </div>
  );
};
