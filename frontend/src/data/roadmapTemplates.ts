/**
 * LRN-DATA-01: lộ trình mẫu dựng từ khóa học thật.
 *
 * Nguồn: database/seeders/engineering-career-courses.json (cùng track, cấp độ và thứ tự).
 * Mỗi bước trỏ tới một bài đã xuất bản qua `courseSlug`, mở tại /courses/<slug>.
 * Không còn số tuần hay giai đoạn tự đặt: khi seeder đổi, cập nhật file này theo.
 */
export type TemplateLevel = 'Foundation' | 'Intermediate' | 'Senior';
type Stage = { title: string; description: string; courseSlug: string };
type Template = { id: string; role: string; level: TemplateLevel; duration: string; summary: string; stages: Stage[] };

const tracks: { slug: string; role: string; levels: Record<TemplateLevel, Stage[]> }[] = [
  { slug: 'data-engineer', role: 'Data Engineer', levels: {
    Foundation: [
      { courseSlug: 'de-foundation-python-du-lieu', title: 'Python xử lý dữ liệu', description: 'Kiểu dữ liệu, hàm, ngoại lệ, đọc và ghi CSV/JSON, quản lý môi trường và tổ chức mã nguồn.' },
      { courseSlug: 'de-foundation-sql', title: 'SQL truy vấn và tổng hợp dữ liệu', description: 'SELECT, JOIN, GROUP BY, subquery, window function cơ bản và xử lý NULL trên PostgreSQL.' },
      { courseSlug: 'de-foundation-mo-hinh-du-lieu', title: 'Mô hình dữ liệu quan hệ', description: 'Thực thể, khóa chính, khóa ngoại, chuẩn hóa, ràng buộc và cách lập sơ đồ quan hệ.' },
      { courseSlug: 'de-foundation-thong-ke-chat-luong', title: 'Thống kê và chất lượng dữ liệu', description: 'Giá trị thiếu, bản ghi trùng, phân phối, giá trị ngoại lệ, trung vị và cách kiểm tra dữ liệu đầu vào.' },
    ],
    Intermediate: [
      { courseSlug: 'de-intermediate-etl-elt', title: 'Thiết kế pipeline ETL và ELT', description: 'Thu thập, kiểm tra, biến đổi, nạp dữ liệu, phân chia batch và kiểm soát lần chạy lại.' },
      { courseSlug: 'de-intermediate-kho-du-lieu', title: 'Kho dữ liệu và mô hình dimensional', description: 'Fact, dimension, grain, star schema, khóa thay thế và thay đổi thuộc tính theo thời gian.' },
      { courseSlug: 'de-intermediate-pipeline-chat-luong', title: 'Kiểm thử và quan sát pipeline', description: 'Data contract, kiểm thử schema, freshness, completeness, cảnh báo và truy vết dữ liệu qua từng bước.' },
      { courseSlug: 'de-intermediate-du-lieu-gia-tang', title: 'Xử lý dữ liệu gia tăng và CDC', description: 'Watermark, tải tăng dần, change data capture, sự kiện đến trễ và trùng lặp.' },
    ],
    Senior: [
      { courseSlug: 'de-senior-kien-truc-streaming', title: 'Kiến trúc streaming và xử lý sự kiện', description: 'Phân vùng, thứ tự sự kiện, event time, cửa sổ xử lý, checkpoint và backpressure.' },
      { courseSlug: 'de-senior-hieu-nang-chi-phi', title: 'Tối ưu truy vấn, lưu trữ và chi phí', description: 'Đọc kế hoạch truy vấn, chọn index, phân vùng, kích thước dữ liệu quét và đánh đổi giữa độ trễ và chi phí.' },
      { courseSlug: 'de-senior-governance-bao-mat', title: 'Data governance, bảo mật và lineage', description: 'Quyền truy cập tối thiểu, phân loại dữ liệu, thông tin nhạy cảm, lưu vết nguồn gốc và chính sách lưu giữ.' },
      { courseSlug: 'de-senior-do-tin-cay-phuc-hoi', title: 'Độ tin cậy và phục hồi nền tảng dữ liệu', description: 'SLO, backup, khôi phục, kiểm thử khôi phục, phân loại sự cố và đánh đổi RPO/RTO.' },
    ],
  } },
  { slug: 'software-engineer', role: 'Software Engineer', levels: {
    Foundation: [
      { courseSlug: 'se-foundation-lap-trinh', title: 'Lập trình nền tảng và giải quyết vấn đề', description: 'Biến, điều kiện, vòng lặp, hàm, cấu trúc dữ liệu cơ bản và phân rã vấn đề.' },
      { courseSlug: 'se-foundation-cau-truc-du-lieu', title: 'Cấu trúc dữ liệu và thuật toán', description: 'Mảng, danh sách, stack, queue, map, tìm kiếm, sắp xếp và độ phức tạp thời gian cơ bản.' },
      { courseSlug: 'se-foundation-web-http', title: 'Web và HTTP cơ bản', description: 'Client/server, URL, request, response, HTTP method, mã trạng thái và JSON.' },
      { courseSlug: 'se-foundation-git-testing', title: 'Git và kiểm thử phần mềm cơ bản', description: 'Commit, branch, diff, pull request, unit test, test case và kiểm tra kết quả mong đợi.' },
    ],
    Intermediate: [
      { courseSlug: 'se-intermediate-api', title: 'Xây dựng API và hợp đồng dữ liệu', description: 'Thiết kế REST, validation, phân trang, quản lý lỗi, tương thích ngược và tài liệu hợp đồng API.' },
      { courseSlug: 'se-intermediate-db-transactions', title: 'Database, giao dịch và đồng thời', description: 'Mô hình quan hệ, index, transaction, locking, race condition và thao tác idempotent.' },
      { courseSlug: 'se-intermediate-clean-architecture', title: 'Tổ chức mã nguồn và ranh giới nghiệp vụ', description: 'Phân tách controller, service, model và policy; dependency injection; ranh giới module và kiểm thử hợp đồng.' },
      { courseSlug: 'se-intermediate-bao-mat', title: 'Bảo mật ứng dụng web', description: 'Xác thực, phân quyền, quản lý phiên, validation, bảo vệ secrets và nguyên tắc quyền tối thiểu.' },
    ],
    Senior: [
      { courseSlug: 'se-senior-system-design', title: 'Thiết kế hệ thống và đánh đổi kiến trúc', description: 'Yêu cầu phi chức năng, ranh giới dịch vụ, tính sẵn sàng, độ trễ, tính nhất quán và lựa chọn kiến trúc.' },
      { courseSlug: 'se-senior-reliability', title: 'SRE: Vận hành và xử lý sự cố', description: 'SLI/SLO, logging, tracing, alert, phân loại sự cố, rollback và tổng kết không đổ lỗi.' },
      { courseSlug: 'se-senior-distributed-systems', title: 'Hệ thống phân tán và độ tin cậy', description: 'Timeout, retry, exponential backoff, idempotency, hàng đợi, duplicate delivery và giới hạn phụ thuộc ngoài.' },
      { courseSlug: 'se-senior-technical-leadership', title: 'Technical leadership và phát triển đội ngũ', description: 'Ra quyết định có bằng chứng, phân chia công việc, review thiết kế, hướng dẫn đồng đội và truyền đạt rủi ro.' },
    ],
  } },
];

const LEVELS: TemplateLevel[] = ['Foundation', 'Intermediate', 'Senior'];

/** Trình độ lưu ở learning_roadmaps.level (LRN-DB-01) khi người dùng tạo lộ trình từ mẫu. */
export const TEMPLATE_LEVEL_TO_ROADMAP_LEVEL: Record<TemplateLevel, 'beginner' | 'intermediate' | 'advanced'> = {
  Foundation: 'beginner',
  Intermediate: 'intermediate',
  Senior: 'advanced',
};

export const roadmapTemplates: Template[] = tracks.flatMap((track) => LEVELS.map((level) => {
  const stages = track.levels[level];
  return {
    id: `${track.slug}-${level.toLowerCase()}`,
    role: track.role,
    level,
    // Không có số tuần thật cho mẫu; hiển thị số khóa học thay vì một khoảng thời gian tự đặt.
    duration: `${stages.length} khóa học`,
    summary: `Lộ trình ${track.role} cấp độ ${level}, gồm ${stages.length} khóa học đang có trên KnowledgeHub.`,
    stages,
  };
}));
