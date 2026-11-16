type Stage = { title: string; description: string };
type Template = { id: string; role: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; duration: string; summary: string; stages: Stage[] };

const tracks = [
  { slug: 'data-engineer', role: 'Data Engineer', stages: {
    beginner: [['Nền tảng dữ liệu', 'Học SQL, kiểu dữ liệu và phân tích cơ bản.'], ['Lập trình', 'Viết các đoạn mã Python nhỏ để xử lý dữ liệu.'], ['Pipeline', 'Chuyển và làm sạch dữ liệu một cách đáng tin cậy.'], ['Thực hành', 'Ghi lại một dự án dữ liệu hoàn chỉnh từ đầu đến cuối.']],
    intermediate: [['Mô hình hóa dữ liệu', 'Thiết kế tập dữ liệu phân tích dễ bảo trì.'], ['Điều phối', 'Lên lịch và theo dõi các luồng dữ liệu.'], ['Hệ thống đám mây', 'Dùng các công cụ lưu trữ và xử lý được quản lý sẵn.'], ['Độ tin cậy', 'Thêm kiểm thử, truy vết nguồn gốc dữ liệu và quy trình khôi phục.']],
    advanced: [['Kiến trúc', 'So sánh mẫu xử lý theo lô và xử lý luồng.'], ['Mở rộng', 'Tối ưu chi phí lưu trữ, tính toán và truy vấn.'], ['Quản trị dữ liệu', 'Thiết kế ranh giới về quyền riêng tư và truy cập.'], ['Dẫn dắt', 'Rà soát thiết kế một nền tảng dữ liệu đang chạy thật.']],
  } },
  { slug: 'frontend-developer', role: 'Frontend Developer', stages: {
    beginner: [['Nền tảng web', 'Luyện HTML ngữ nghĩa và bố cục CSS.'], ['JavaScript', 'Xử lý trạng thái, sự kiện và dữ liệu bất đồng bộ.'], ['React', 'Xây thành phần tái sử dụng và các trang đơn giản.'], ['Thực hành', 'Xuất bản một dự án thích ứng mọi màn hình và dễ tiếp cận.']],
    intermediate: [['Cấu trúc ứng dụng', 'Tổ chức các tuyến trang và thành phần dùng chung.'], ['Luồng dữ liệu', 'Xử lý trạng thái API, biểu mẫu và lỗi.'], ['Chất lượng', 'Kiểm thử tương tác và khả năng tiếp cận.'], ['Hiệu năng', 'Đo và cải thiện tốc độ tải trang.']],
    advanced: [['Kiến trúc', 'Đặt ranh giới cho các ứng dụng frontend lớn.'], ['Hệ thống thiết kế', 'Xây các mẫu giao diện nhất quán, dùng lại được.'], ['Tối ưu', 'Đo và tối ưu việc hiển thị và phân phối.'], ['Dẫn dắt', 'Rà soát khả năng tiếp cận và các đánh đổi của nền tảng.']],
  } },
  { slug: 'ai-engineer', role: 'AI Engineer', stages: {
    beginner: [['Nền tảng Python', 'Làm việc với dữ liệu và hàm có kiểu.'], ['Cơ bản về ML', 'Hiểu cách đánh giá mô hình và chia tập huấn luyện, kiểm tra.'], ['API mô hình', 'Gọi mô hình với đầu vào và đầu ra an toàn.'], ['Thực hành', 'Xây và đánh giá một trợ lý nhỏ.']],
    intermediate: [['Truy xuất', 'Dựa câu trả lời trên nguồn đáng tin cậy.'], ['Đánh giá', 'Đo chất lượng, lỗi và các kiểu thất bại.'], ['Triển khai', 'Triển khai một API suy luận đáng tin cậy.'], ['An toàn', 'Bảo vệ bí mật và dữ liệu người dùng.']],
    advanced: [['Thiết kế hệ thống', 'Chọn mô hình và kiến trúc truy xuất.'], ['Quan sát hệ thống', 'Theo dõi độ trễ, chi phí và chất lượng.'], ['Độ bền vững', 'Kiểm thử đầu vào đối kháng và hiện tượng trôi dữ liệu.'], ['Dẫn dắt', 'Đặt quy trình phát hành và xử lý sự cố.']],
  } },
] as const;

const levels = [
  { key: 'beginner', label: 'Beginner', duration: '8–12 weeks' },
  { key: 'intermediate', label: 'Intermediate', duration: '10–16 weeks' },
  { key: 'advanced', label: 'Advanced', duration: '12–20 weeks' },
] as const;

export const roadmapTemplates: Template[] = tracks.flatMap((track) => levels.map((level) => ({
  id: `${track.slug}-${level.key}`,
  role: track.role,
  level: level.label,
  duration: level.duration,
  summary: `Lộ trình tham khảo cho ${track.role} trình độ ${level.label}. Chỉnh theo mục tiêu của bạn với trợ lý AI.`,
  stages: track.stages[level.key].map(([title, description]) => ({ title, description })),
})));
