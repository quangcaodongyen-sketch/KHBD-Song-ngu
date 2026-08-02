import React, { useState } from 'react';
import { LessonPlanDocument, EducationLevel, Subject } from '../types';
import {
  Library,
  Search,
  Star,
  Download,
  Trash2,
  Edit2,
  Filter,
  Check,
  BookOpen,
} from 'lucide-react';
import { exportLessonPlanToDocx } from '../utils/docxExporter';
import { SUBJECTS_BY_LEVEL, getSubjectLabel } from '../utils/subjectHelpers';

interface LibraryViewProps {
  libraryDocs: LessonPlanDocument[];
  onOpenDoc: (doc: LessonPlanDocument) => void;
  onUpdateDoc: (doc: LessonPlanDocument) => void;
  onDeleteDoc: (id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  libraryDocs,
  onOpenDoc,
  onUpdateDoc,
  onDeleteDoc,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'all'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState('');

  const filteredDocs = libraryDocs.filter((doc) => {
    const matchesQuery = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || doc.level === selectedLevel;
    const matchesSubject = selectedSubject === 'all' || doc.subject === selectedSubject;
    const matchesFav = !onlyFavorites || doc.isFavorite;
    return matchesQuery && matchesLevel && matchesSubject && matchesFav;
  });

  const handleToggleFavorite = (doc: LessonPlanDocument) => {
    onUpdateDoc({ ...doc, isFavorite: !doc.isFavorite });
  };

  const handleSaveRename = (doc: LessonPlanDocument) => {
    if (editTitleValue.trim()) {
      onUpdateDoc({ ...doc, title: editTitleValue.trim() });
    }
    setEditingTitleId(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Bar */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Thư Viện Kế Hoạch Bài Dạy Song Ngữ (KHBD)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu trữ, quản lý, tìm kiếm và phân loại Kế hoạch bài dạy song ngữ theo cấp học & môn học
              </p>
            </div>
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
              onlyFavorites
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
            <span>{onlyFavorites ? 'Đang lọc: Yêu thích' : 'Chỉ xem Yêu thích'}</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm Kế hoạch bài dạy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium border-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Level Filter */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border-none"
          >
            <option value="all">Tất cả Cấp Học</option>
            <option value="mam_non">Mầm non</option>
            <option value="tieu_hoc">Tiểu học</option>
            <option value="thcs">THCS (Công văn 5512)</option>
            <option value="thpt">THPT</option>
            <option value="gdtx">GDTX</option>
          </select>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold border-none"
          >
            <option value="all">Tất cả Môn Học</option>
            {(selectedLevel === 'all'
              ? Array.from(
                  new Map(
                    Object.values(SUBJECTS_BY_LEVEL)
                      .flat()
                      .map((s) => [s.value, s])
                  ).values()
                )
              : SUBJECTS_BY_LEVEL[selectedLevel] || []
            ).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Library Grid */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
            Không tìm thấy Kế hoạch bài dạy nào phù hợp
          </h3>
          <p className="text-xs text-slate-500">
            Thử thay đổi từ khóa tìm kiếm hoặc bỏ lọc cấp học/môn học.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isEditing = editingTitleId === doc.id;

            return (
              <div
                key={doc.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                      {doc.level.toUpperCase()} • {getSubjectLabel(doc.subject)}
                    </span>

                    <button
                      onClick={() => handleToggleFavorite(doc)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={doc.isFavorite ? 'Bỏ yêu thích' : 'Đánh dấu yêu thích'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          doc.isFavorite
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={editTitleValue}
                        onChange={(e) => setEditTitleValue(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-blue-500 rounded bg-transparent text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveRename(doc)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between group">
                      <h3
                        onClick={() => onOpenDoc(doc)}
                        className="font-bold text-slate-900 dark:text-white text-sm cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                      >
                        {doc.title}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingTitleId(doc.id);
                          setEditTitleValue(doc.title);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition-opacity"
                        title="Đổi tên"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chế độ: {doc.alignmentMode} • Số trang: {doc.pageCount || 1}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => onOpenDoc(doc)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                  >
                    Mở làm việc
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => exportLessonPlanToDocx(doc)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      title="Xuất Word (.docx)"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa "${doc.title}"?`)) {
                          onDeleteDoc(doc.id);
                        }
                      }}
                      className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 transition-colors"
                      title="Xóa giáo án"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
