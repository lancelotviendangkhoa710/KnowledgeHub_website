export const DRAFT_STORAGE_KEY = 'kh_course_editor_draft';
export const LOCAL_STUDIO_DRAFT_KEY = 'kh_studio_course_draft_v2';

export interface StoredDraft {
  title: string;
  slug: string;
  categoryId: string;
  tags: string[];
  content: string;
  isSlugLocked: boolean;
  savedAt: number;
}

export type ViewMode = 'split' | 'editor' | 'preview';

/**
 * Nội dung mẫu của phiên bản cũ (tiếng Anh). Form mới giờ để trống; chuỗi này chỉ để nhận ra và
 * bỏ qua các bản nháp cũ chưa ai sửa (tên rỗng, nội dung đúng bằng mẫu), không dùng cho mục đích khác.
 */
export const LEGACY_SAMPLE_CONTENT =
`## 1. Introduction & Video Lecture
Detail the systems background, failure modes, or architectural problem this course addresses.

@[youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ "Lecture 1: Distributed Systems Overview")

\`\`\`typescript
// Provide executable or concrete code examples
interface ConsensusNode {
  id: string;
  term: number;
  votedFor: string | null;
}
\`\`\`

## 2. Invariants & Operational Guarantees
List the mathematical or operational guarantees enforced by this architecture.

> [!NOTE]
> Operational Invariant: No state machine may execute state transitions out of global log order.
`
;

export const CODE_TEMPLATES: Record<string, string> = {
  typescript: `// Viết kiểu hoặc logic TypeScript có thể chạy được\ninterface ExampleNode {\n  id: string;\n  active: boolean;\n}`,
  python: `# Viết đoạn xử lý hoặc thuật toán bằng Python\ndef process_node(node_id: str) -> bool:\n    return True`,
  sql: `-- Viết truy vấn giao dịch hoặc phân tích bằng SQL\nSELECT id, created_at, status\nFROM records\nWHERE status = 'active';`,
  bash: `# Chạy lệnh hạ tầng hoặc lệnh thực thi\ndocker compose exec app php artisan migrate`,
  rust: `// Viết logic đồng thời hoặc logic hệ thống\nfn main() {\n    println!("KnowledgeHub Engine");\n}`,
  json: `{\n  "version": "1.0",\n  "status": "success"\n}`,
};

export const CODE_LANGUAGES = [
  { lang: 'typescript', label: 'TypeScript' },
  { lang: 'python', label: 'Python' },
  { lang: 'sql', label: 'SQL' },
  { lang: 'bash', label: 'Bash' },
  { lang: 'rust', label: 'Rust' },
  { lang: 'json', label: 'JSON' },
];
