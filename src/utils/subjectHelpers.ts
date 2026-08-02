import { EducationLevel, Subject } from '../types';

export interface SubjectOption {
  value: Subject;
  label: string;
}

export const SUBJECTS_BY_LEVEL: Record<EducationLevel, SubjectOption[]> = {
  mam_non: [
    { value: 'phat_trien_the_chat', label: 'Phát triển thể chất' },
    { value: 'phat_trien_nhan_thuc', label: 'Phát triển nhận thức' },
    { value: 'phat_trien_ngon_ngu', label: 'Phát triển ngôn ngữ' },
    { value: 'phat_trien_tinh_cam', label: 'Phát triển tình cảm & Kỹ năng xã hội' },
    { value: 'phat_trien_tham_my', label: 'Phát triển thẩm mỹ' },
    { value: 'khac', label: 'Môn học khác' },
  ],
  tieu_hoc: [
    { value: 'ngu_van', label: 'Tiếng Việt' },
    { value: 'toan', label: 'Toán học' },
    { value: 'tieng_anh', label: 'Tiếng Anh' },
    { value: 'dao_duc', label: 'Đạo đức' },
    { value: 'tu_nhien_xa_hoi', label: 'Tự nhiên và Xã hội (Lớp 1-3)' },
    { value: 'khoa_hoc', label: 'Khoa học (Lớp 4-5)' },
    { value: 'lich_su_dia_ly', label: 'Lịch sử và Địa lý (Lớp 4-5)' },
    { value: 'tin_hoc', label: 'Tin học & Công nghệ' },
    { value: 'am_nhac', label: 'Âm nhạc' },
    { value: 'my_thuat', label: 'Mĩ thuật' },
    { value: 'the_duc', label: 'Giáo dục thể chất' },
    { value: 'hoat_dong_trai_nghiem', label: 'Hoạt động trải nghiệm' },
    { value: 'khac', label: 'Môn học khác' },
  ],
  thcs: [
    { value: 'ngu_van', label: 'Ngữ văn' },
    { value: 'toan', label: 'Toán học' },
    { value: 'tieng_anh', label: 'Tiếng Anh' },
    { value: 'dao_duc', label: 'Giáo dục công dân' },
    { value: 'khoa_hoc', label: 'Khoa học tự nhiên (Lớp 6-9)' },
    { value: 'lich_su_dia_ly', label: 'Lịch sử và Địa lý' },
    { value: 'tin_hoc', label: 'Tin học' },
    { value: 'cong_nghe', label: 'Công nghệ' },
    { value: 'am_nhac', label: 'Âm nhạc' },
    { value: 'my_thuat', label: 'Mĩ thuật' },
    { value: 'the_duc', label: 'Giáo dục thể chất' },
    { value: 'hoat_dong_trai_nghiem', label: 'Hoạt động trải nghiệm, hướng nghiệp' },
    { value: 'giao_duc_dia_phuong', label: 'Nội dung giáo dục địa phương' },
    { value: 'khac', label: 'Môn học khác' },
  ],
  thpt: [
    { value: 'ngu_van', label: 'Ngữ văn' },
    { value: 'toan', label: 'Toán học' },
    { value: 'tieng_anh', label: 'Tiếng Anh' },
    { value: 'dao_duc', label: 'Giáo dục kinh tế và pháp luật' },
    { value: 'lich_su', label: 'Lịch sử' },
    { value: 'dia_ly', label: 'Địa lý' },
    { value: 'vat_ly', label: 'Vật lý' },
    { value: 'hoa_hoc', label: 'Hóa học' },
    { value: 'sinh_hoc', label: 'Sinh học' },
    { value: 'tin_hoc', label: 'Tin học' },
    { value: 'cong_nghe', label: 'Công nghệ' },
    { value: 'am_nhac', label: 'Âm nhạc' },
    { value: 'my_thuat', label: 'Mĩ thuật' },
    { value: 'the_duc', label: 'Giáo dục thể chất' },
    { value: 'quoc_phong', label: 'Giáo dục quốc phòng và an ninh' },
    { value: 'hoat_dong_trai_nghiem', label: 'Hoạt động trải nghiệm, hướng nghiệp' },
    { value: 'giao_duc_dia_phuong', label: 'Nội dung giáo dục địa phương' },
    { value: 'khac', label: 'Môn học khác' },
  ],
  gdtx: [
    { value: 'toan', label: 'Toán học' },
    { value: 'ngu_van', label: 'Ngữ văn' },
    { value: 'tieng_anh', label: 'Tiếng Anh' },
    { value: 'lich_su', label: 'Lịch sử' },
    { value: 'dia_ly', label: 'Địa lý' },
    { value: 'vat_ly', label: 'Vật lý' },
    { value: 'hoa_hoc', label: 'Hóa học' },
    { value: 'sinh_hoc', label: 'Sinh học' },
    { value: 'tin_hoc', label: 'Tin học' },
    { value: 'cong_nghe', label: 'Công nghệ' },
    { value: 'khac', label: 'Môn học khác' },
  ],
};

export const GRADES_BY_LEVEL: Record<EducationLevel, { value: string; label: string }[]> = {
  mam_non: [
    { value: 'nha_tre', label: 'Nhà trẻ (24-36 tháng)' },
    { value: 'mau_giao_3_4', label: 'Mẫu giáo 3-4 tuổi' },
    { value: 'mau_giao_4_5', label: 'Mẫu giáo 4-5 tuổi' },
    { value: 'mau_giao_5_6', label: 'Mẫu giáo 5-6 tuổi (Lá)' },
  ],
  tieu_hoc: [
    { value: 'lop1', label: 'Lớp 1' },
    { value: 'lop2', label: 'Lớp 2' },
    { value: 'lop3', label: 'Lớp 3' },
    { value: 'lop4', label: 'Lớp 4' },
    { value: 'lop5', label: 'Lớp 5' },
  ],
  thcs: [
    { value: 'lop6', label: 'Lớp 6' },
    { value: 'lop7', label: 'Lớp 7' },
    { value: 'lop8', label: 'Lớp 8' },
    { value: 'lop9', label: 'Lớp 9' },
  ],
  thpt: [
    { value: 'lop10', label: 'Lớp 10' },
    { value: 'lop11', label: 'Lớp 11' },
    { value: 'lop12', label: 'Lớp 12' },
  ],
  gdtx: [
    { value: 'gdtx_khoi_cap', label: 'Khối GDTX' },
  ],
};

export function getSubjectLabel(subject: Subject): string {
  for (const level of Object.keys(SUBJECTS_BY_LEVEL) as EducationLevel[]) {
    const match = SUBJECTS_BY_LEVEL[level].find((s) => s.value === subject);
    if (match) return match.label;
  }
  return 'Môn học';
}
