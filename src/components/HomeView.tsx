import React from 'react';
import { NavTab, EducationLevel } from '../types';
import {
  Sparkles,
  FileCheck,
  ShieldCheck,
  Award,
  Layers,
  ArrowRight,
  BookOpen,
  FileText,
  Zap,
  PhoneCall,
  CheckCircle2,
  Table,
  Check,
} from 'lucide-react';

interface HomeViewProps {
  setActiveTab: (tab: NavTab) => void;
  onSelectSamplePlan: (sampleId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  setActiveTab,
  onSelectSamplePlan,
}) => {
  const levels: { id: EducationLevel; title: string; desc: string; count: string }[] = [
    { id: 'mam_non', title: 'Mầm Nông', desc: 'Trò chơi, thơ, bài hát, hoạt động phát triển', count: 'Mầm - Chồi - Lá' },
    { id: 'tieu_hoc', title: 'Tiểu Học', desc: 'Lớp 1 - 5 theo chương trình GDPT 2018', count: 'Tất cả môn học' },
    { id: 'thcs', title: 'THCS', desc: 'Lớp 6 - 9 chuẩn Công văn 5512 / BGDĐT', count: 'Tất cả môn học' },
    { id: 'thpt', title: 'THPT', desc: 'Lớp 10 - 12 chuẩn Bộ GD&ĐT & Đổi mới', count: 'Chuyên đề & Bắt buộc' },
    { id: 'gdtx', title: 'GDTX', desc: 'Giáo dục thường xuyên & Trung tâm GDTX', count: 'Khung chương trình GDTX' },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-8 sm:p-12 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md text-xs font-semibold text-blue-200">
            <Award className="w-4 h-4 text-amber-300" />
            <span>Chuẩn Bộ GD&ĐT • Chương trình GDPT 2018 • Công văn 5512</span>
          </div>

          <h1 className="font-extrabold tracking-tight leading-tight">
            <span className="block text-lg sm:text-3xl md:text-4xl lg:text-5xl whitespace-nowrap">Tạo Kế Hoạch Bài Dạy Song Ngữ Việt – Anh</span>
            <span className="block text-base sm:text-2xl font-semibold text-blue-300 mt-2">Giữ Nguyên 100% Định Dạng & Độ Rộng Cột</span>
          </h1>

          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Giải pháp AI chuyên sâu dành cho giáo viên Việt Nam. Tự động chuyển đổi Kế hoạch bài dạy (KHBD) tiếng Việt sang song ngữ chất lượng cao. Giữ nguyên 100% độ rộng cột, khoá tự động hình ảnh, hình vẽ, công thức toán (MathType) và cấu trúc bài dạy chuẩn Công văn 5512.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setActiveTab('editor')}
              className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-5 h-5" />
              <span>Tải KHBD lên & Dịch ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Author Contact Tag */}
          <div className="pt-4 border-t border-white/10 flex items-center space-x-6 text-xs text-blue-200">
            <div>
              <span className="opacity-75">Tác giả biên soạn:</span>{' '}
              <strong className="text-white font-semibold">Đinh Văn Thành</strong>
            </div>
            <div className="flex items-center space-x-1 text-amber-300">
              <PhoneCall className="w-3.5 h-3.5" />
              <span>0915.213717</span>
            </div>
          </div>
        </div>
      </section>

      {/* Target Levels Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Hỗ Trợ Tất Cả Các Cấp Học & Môn Học
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chuyên biệt hóa theo khung chuẩn của Bộ Giáo dục và Đào tạo
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {levels.map((lvl) => (
            <div
              key={lvl.id}
              onClick={() => setActiveTab('editor')}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold mb-3 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                {lvl.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                {lvl.desc}
              </p>

              <span className="inline-block text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">
                {lvl.count}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Highlight Core Features */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quy Định & Tiêu Chuẩn Kế Hoạch Bài Dạy Song Ngữ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Tuân thủ tuyệt đối quy định màu sắc, cỡ chữ, font chữ và cấu trúc bài dạy
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Quy Định Màu Chữ & Kiểu Dáng
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Bản dịch tiếng Anh nằm ngay bên dưới đoạn tiếng Việt. Sử dụng màu xanh đậm chuẩn <strong className="text-blue-700 font-mono">RGB(0,51,153) / #003399</strong>, in nghiêng, không in đậm, không gạch chân, giữ nguyên cỡ chữ gốc.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Giữ Nguyên Bảng Biểu & Cấu Trúc
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tất cả bảng biểu, hình ảnh, SmartArt, Textbox, MathType, Header/Footer, số trang và danh sách bullet được giữ nguyên 100%. Không đảo vị trí, gộp hay tách phần.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Chuẩn Thuật Ngữ Bộ GD&ĐT
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tự động tham chiếu thuật ngữ học thuật từ Chương trình GDPT 2018, Thông tư hiện hành, Công văn 5512, Cambridge, CEFR và UNESCO Education Terms.
            </p>
          </div>
        </div>
      </section>

      {/* Author Info Banner */}
      <section className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base">Chuyên Gia Đồng Hành Cùng Giáo Viên</h3>
          </div>
          <p className="text-xs text-slate-300">
            Biên soạn & phát triển bởi <strong>Đinh Văn Thành</strong> — Chuyên gia giáo dục & dịch thuật học thuật Anh - Việt.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <a
            href="tel:0915213717"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-2 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Liên hệ: 0915.213717</span>
          </a>
        </div>
      </section>
    </div>
  );
};
