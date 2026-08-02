import React, { useState } from 'react';
import { Phone, User, Award, ShieldCheck, Mail, Send, CheckCircle2, MessageSquare } from 'lucide-react';

export const ContactView: React.FC = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Author Card Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 border-2 border-blue-400 flex items-center justify-center font-extrabold text-2xl text-white shadow-lg">
            ĐVT
          </div>
          <div className="text-center sm:text-left space-y-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              <Award className="w-3.5 h-3.5 mr-1 text-amber-300" />
              Tác Giả Phát Triển
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Đinh Văn Thành
            </h1>
            <p className="text-xs text-blue-200">
              Chuyên gia Giáo dục • Chuyên gia Biên soạn Kế hoạch bài dạy (KHBD) & Dịch thuật Học thuật Anh - Việt
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-blue-800/80 text-xs">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/10 backdrop-blur-md">
            <Phone className="w-5 h-5 text-amber-300 shrink-0" />
            <div>
              <span className="block text-blue-200 text-[10px] uppercase font-bold">
                Điện thoại / Zalo Hỗ Trợ Trực Tiếp:
              </span>
              <a href="tel:0915213717" className="font-extrabold text-sm hover:underline text-white">
                0915.213717
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/10 backdrop-blur-md">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="block text-blue-200 text-[10px] uppercase font-bold">
                Cam Kết Chất Lượng:
              </span>
              <span className="font-bold text-xs text-white">
                Cập nhật liên tục theo Công văn & Thông tư mới nhất của Bộ GD&ĐT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form & Support Request */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Gửi Yêu Cầu Hỗ Trợ Hoặc Đóng Góp Ý Kiến
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dành cho giáo viên, tổ chuyên môn hoặc ban giám hiệu các trường cần tư vấn biên soạn Kế hoạch bài dạy (KHBD) song ngữ.
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs space-y-2 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-sm">Gửi Yêu Cầu Thành Công!</h3>
            <p>
              Cảm ơn thầy/cô <strong>{name}</strong>. Tác giả Đinh Văn Thành (0915.213717) sẽ sớm liên hệ phản hồi qua SĐT/Zalo.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên Giáo viên:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại / Zalo:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ví dụ: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium border-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Trường / Đơn vị công tác (Tùy chọn):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: THCS Nguyễn Du - Hà Nội"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium border-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nội dung cần hỗ trợ / Góp ý tính năng:
              </label>
              <textarea
                rows={4}
                required
                placeholder="Nhập nội dung thắc mắc hoặc yêu cầu bổ sung từ điển môn học..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium border-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Gửi tin nhắn cho tác giả</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
