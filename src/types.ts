export type NavTab = 
  | 'home' 
  | 'editor' 
  | 'history' 
  | 'library' 
  | 'settings' 
  | 'guide' 
  | 'contact';

export type EducationLevel = 
  | 'mam_non' 
  | 'tieu_hoc' 
  | 'thcs' 
  | 'thpt' 
  | 'gdtx';

export type Subject = 
  | 'phat_trien_the_chat'
  | 'phat_trien_nhan_thuc'
  | 'phat_trien_ngon_ngu'
  | 'phat_trien_tinh_cam'
  | 'phat_trien_tham_my'
  | 'toan' 
  | 'ngu_van' 
  | 'tieng_anh' 
  | 'dao_duc'
  | 'tu_nhien_xa_hoi'
  | 'khoa_hoc' 
  | 'vat_ly' 
  | 'hoa_hoc' 
  | 'sinh_hoc' 
  | 'lich_su'
  | 'dia_ly'
  | 'lich_su_dia_ly' 
  | 'tin_hoc' 
  | 'cong_nghe' 
  | 'am_nhac' 
  | 'my_thuat' 
  | 'the_duc' 
  | 'quoc_phong'
  | 'hoat_dong_trai_nghiem' 
  | 'giao_duc_dia_phuong'
  | 'khac';

export type AlignmentMode = 
  | 'original'       // □ Giữ nguyên bản KHBD gốc
  | 'moet_standard'  // □ Chuẩn theo mẫu Bộ GDĐT
  | 'circular'       // □ Chuẩn theo Thông tư hiện hành
  | 'cv_5512'        // □ Chuẩn theo Công văn 5512
  | 'school_custom'; // □ Chuẩn theo mẫu trường

export type AIMode = 
  | 'fast'     // Nhanh
  | 'balanced' // Cân bằng
  | 'precise';  // Chính xác nhất

export type NodeType = 
  | 'title' 
  | 'heading1' 
  | 'heading2' 
  | 'heading3' 
  | 'paragraph' 
  | 'bullet' 
  | 'table' 
  | 'caption' 
  | 'textbox' 
  | 'header_footer';

export interface TableCellNode {
  id: string;
  contentVi: string;
  contentEn: string;
  isHeader?: boolean;
  imageData?: string;
}

export interface TableRowNode {
  id: string;
  cells: TableCellNode[];
}

export interface IntegrationOptions {
  nls: boolean; // Tích hợp Năng lực số (NLS)
  ai3439: boolean; // Tích hợp Năng lực AI theo QĐ 3439/QĐ-BGDĐT
  stem: boolean; // Tích hợp Giáo dục STEM
  env: boolean; // Tích hợp Bảo vệ môi trường & Kỹ năng sống
}

export interface PlanNode {
  id: string;
  type: NodeType;
  contentVi: string;
  contentEn: string;
  imageData?: string;
  fontSize?: number; // e.g. 13 or 14
  isBold?: boolean;
  isItalic?: boolean;
  isIntegrated?: boolean; // Tích hợp thêm NLS/AI QĐ 3439 (hiển thị chữ màu đỏ)
  integrationType?: 'nls' | 'ai_3439' | 'stem' | 'env';
  align?: 'left' | 'center' | 'right' | 'justify';
  tableRows?: TableRowNode[];
  sectionName?: string; // e.g. "Hoạt động 1", "Mục tiêu"
  pageNumber?: number;
}

export interface LessonPlanDocument {
  id: string;
  title: string;
  level: EducationLevel;
  subject: Subject;
  grade?: string;
  alignmentMode: AlignmentMode;
  aiMode: AIMode;
  nodes: PlanNode[];
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  isFavorite?: boolean;
  notes?: string;
  originalFileName?: string;
  integrations?: IntegrationOptions;
}

export interface QualityCheckIssue {
  type: 'terminology' | 'spelling' | 'formatting' | 'missing_translation';
  description: string;
  suggestion: string;
  nodeId?: string;
}

export interface QualityCheckReport {
  score: number;
  summary: string;
  issues: QualityCheckIssue[];
}

export type TranslationMode = 'mock' | 'ai';

export type BilingualStyle = 
  | 'parallel'    // Kiểu 1: Đoạn song song (Vi trên, En dưới)
  | 'two_column'  // Kiểu 2: Bảng 2 cột (Trái Vi, Phải En)
  | 'section';    // Kiểu 3: Theo mục lớn

export type TranslationStyleOption = 
  | 'academic'  // Dịch sát chuyên ngành
  | 'simple'    // Dễ hiểu cho học sinh
  | 'formal';   // Trang trọng (báo cáo, hội thảo)

export interface GlossaryItem {
  id: string;
  termVi: string;
  termEn: string;
  category: 'moet' | 'cv5512' | 'gdpt2018' | 'subject' | 'custom';
  note?: string;
}
