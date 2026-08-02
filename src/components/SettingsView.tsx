import React, { useState } from 'react';
import { MOET_GLOSSARY } from '../data/educationGlossary';
import { GlossaryItem, AIMode, AlignmentMode } from '../types';
import { Settings, Plus, Trash2, Save, Shield, Database, Check } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [glossary, setGlossary] = useState<GlossaryItem[]>(MOET_GLOSSARY);
  const [newVi, setNewVi] = useState('');
  const [newEn, setNewEn] = useState('');
  const [defaultAiMode, setDefaultAiMode] = useState<AIMode>('precise');
  const [defaultAlignment, setDefaultAlignment] = useState<AlignmentMode>('cv_5512');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddGlossaryTerm = () => {
    if (!newVi.trim() || !newEn.trim()) return;
    const newItem: GlossaryItem = {
      id: `gl-${Date.now()}`,
      termVi: newVi.trim(),
      termEn: newEn.trim(),
      category: 'custom',
    };
    setGlossary([newItem, ...glossary]);
    setNewVi('');
    setNewEn('');
  };

  const handleDeleteTerm = (id: string) => {
    setGlossary(glossary.filter((g) => g.id !== id));
  };

  const handleSaveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Cài Đặt Cấu Hình & Từ Điển Học Thuật
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tùy chỉnh từ điển giáo dục, mặc định chế độ AI & chính sách bảo mật
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Đã lưu cấu hình!' : 'Lưu cấu hình'}</span>
        </button>
      </div>

      {/* Defaults Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          1. Mặc Định Hệ Thống Soạn Thảo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chế độ AI mặc định khi mở ứng dụng:
            </label>
            <select
              value={defaultAiMode}
              onChange={(e) => setDefaultAiMode(e.target.value as AIMode)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border-none"
            >
              <option value="fast">Nhanh (Fast)</option>
              <option value="balanced">Cân bằng (Balanced)</option>
              <option value="precise">Chính xác nhất (Precise - Thuật ngữ GDPT 2018)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chế độ căn chỉnh mặc định:
            </label>
            <select
              value={defaultAlignment}
              onChange={(e) => setDefaultAlignment(e.target.value as AlignmentMode)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border-none"
            >
              <option value="original">□ Giữ nguyên bản KHBD gốc</option>
              <option value="moet_standard">□ Chuẩn theo mẫu Bộ GDĐT</option>
              <option value="circular">□ Chuẩn theo Thông tư hiện hành</option>
              <option value="cv_5512">□ Chuẩn theo Công văn 5512</option>
              <option value="school_custom">□ Chuẩn theo mẫu trường</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dictionary / Glossary Manager */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Từ Điển Thuật Ngữ Giáo Dục Bộ GD&ĐT & Tự Định Nghĩa
            </h3>
            <p className="text-xs text-slate-500">
              AI sẽ ưu tiên dùng các cặp từ điển này để dịch chính xác ngữ cảnh môn học của bạn
            </p>
          </div>
        </div>

        {/* Add New Term */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Thuật ngữ Tiếng Việt (Ví dụ: Yêu cầu cần đạt)"
            value={newVi}
            onChange={(e) => setNewVi(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border-none"
          />
          <input
            type="text"
            placeholder="Dịch Tiếng Anh (Ví dụ: Learning Outcomes)"
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border-none"
          />
          <button
            onClick={handleAddGlossaryTerm}
            className="flex items-center space-x-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm từ</span>
          </button>
        </div>

        {/* Term Table List */}
        <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
              <tr>
                <th className="p-3">Thuật Ngữ Tiếng Việt</th>
                <th className="p-3">Dịch Tiếng Anh</th>
                <th className="p-3">Phân Loại</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {glossary.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                    {item.termVi}
                  </td>
                  <td className="p-3 italic text-[#003399] dark:text-blue-400 font-medium">
                    {item.termEn}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 uppercase">
                      {item.category}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteTerm(item.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy & Safety Section */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-3 shadow-xl">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider">
            3. Cam Kết Bảo Mật & An Toàn Dữ Liệu
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Ứng dụng tôn trọng tối đa quyền riêng tư của thầy cô. Mọi file tài liệu Word/PDF tải lên được xử lý bảo mật trên Server-side Gemini API. Dữ liệu sẽ không được chia sẻ hay lưu trữ lâu dài nếu không được người dùng cho phép.
        </p>
      </div>
    </div>
  );
};
