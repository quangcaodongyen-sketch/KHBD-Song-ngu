import { LessonPlanDocument } from '../types';

export const SAMPLE_LESSON_PLANS: LessonPlanDocument[] = [];

export const createBlankDocument = (): LessonPlanDocument => ({
  id: `doc-${Date.now()}`,
  title: 'Giáo án mới',
  level: 'thcs',
  subject: 'toan',
  grade: 'lop8',
  alignmentMode: 'school_custom',
  aiMode: 'fast',
  nodes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pageCount: 1,
});

