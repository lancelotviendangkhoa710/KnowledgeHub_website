/**
 * Câu lỗi tiếng Anh của backend (Laravel và các service) sang tiếng Việt, chỉ để hiển thị ở giao diện.
 * Câu không có trong bảng được giữ nguyên. Không thay đổi backend; thêm câu mới vào đây khi gặp.
 */
const EXACT: Record<string, string> = {
  // Danh mục (CategoryService, CategoryController)
  'Cannot delete category with articles or subcategories.': 'Không thể xóa danh mục còn khóa học hoặc danh mục con.',
  'Cannot delete category with existing child categories.': 'Không thể xóa danh mục còn danh mục con.',
  'Cannot delete category with associated articles.': 'Không thể xóa danh mục còn khóa học.',
  'A category cannot be its own parent.': 'Một danh mục không thể là danh mục cha của chính nó.',
  'Category not found.': 'Không tìm thấy danh mục.',
  'Category created successfully.': 'Đã tạo danh mục.',
  'Category updated successfully.': 'Đã lưu danh mục.',
  'Category deleted successfully.': 'Đã xóa danh mục.',
  // Thẻ
  'Tag created successfully.': 'Đã tạo thẻ.',
  // Người dùng (AdminUserService, ProfileService)
  'A pending account can only be activated.': 'Tài khoản chờ duyệt chỉ có thể được kích hoạt.',
  'The last active administrator cannot be deactivated.': 'Không thể ngưng hoạt động quản trị viên cuối cùng còn hoạt động.',
  'Only active or inactive accounts can change role.': 'Chỉ tài khoản đang hoạt động hoặc ngưng hoạt động mới đổi được vai trò.',
  'The selected role is not available.': 'Vai trò đã chọn không khả dụng.',
  'The last administrator cannot lose the admin role.': 'Quản trị viên cuối cùng không thể mất vai trò quản trị.',
  'The provided password is incorrect.': 'Mật khẩu không đúng.',
  'User status updated.': 'Đã cập nhật trạng thái người dùng.',
  'User role updated.': 'Đã cập nhật vai trò người dùng.',
  // Lộ trình và trợ lý AI
  'Too many roadmap previews. Please retry later.': 'Bạn xem trước lộ trình quá nhiều lần. Hãy thử lại sau.',
  'Too many chat messages. Please slow down.': 'Bạn gửi quá nhiều tin nhắn. Hãy gửi chậm lại.',
  'A course changed since preview. Generate a new roadmap.': 'Có khóa học đã thay đổi từ lúc xem trước. Hãy tạo lộ trình mới.',
  'An external resource changed since preview. Generate a new roadmap.': 'Có tài nguyên bên ngoài đã thay đổi từ lúc xem trước. Hãy tạo lộ trình mới.',
  'Roadmap preview is too large. Please shorten your details and try again.': 'Bản xem trước lộ trình quá lớn. Hãy rút gọn thông tin rồi thử lại.',
  'CV service is temporarily unavailable. Please retry.': 'Dịch vụ CV đang tạm thời không khả dụng. Vui lòng thử lại.',
  'AI Companion is temporarily unavailable.': 'Trợ lý AI đang tạm thời không khả dụng.',
  'AI Companion failed to reply. Please retry.': 'Trợ lý AI chưa trả lời được. Vui lòng thử lại.',
  'An item cannot be its own prerequisite.': 'Một bước không thể là điều kiện tiên quyết của chính nó.',
  'This prerequisite relationship would create a cycle.': 'Quan hệ tiên quyết này sẽ tạo thành vòng lặp.',
  'This prerequisite relationship already exists.': 'Quan hệ tiên quyết này đã tồn tại.',
  'Prerequisite relationship not found.': 'Không tìm thấy quan hệ tiên quyết.',
  // CV PDF (CompanionRoadmapAiClient)
  'The uploaded PDF could not be read.': 'Không đọc được tệp PDF đã tải lên.',
  'The CV must be a valid PDF.': 'CV phải là tệp PDF hợp lệ.',
  'The PDF has no extractable text or exceeds the supported limit.': 'PDF không có chữ để đọc hoặc vượt quá giới hạn hỗ trợ.',
  // Chung
  'Unauthenticated.': 'Bạn chưa đăng nhập.',
  'Unauthorized.': 'Bạn không có quyền thực hiện thao tác này.',
  'Article not found.': 'Không tìm thấy khóa học.',
  'Bookmark not found.': 'Không tìm thấy mục đã lưu.',
  'This action is unauthorized.': 'Bạn không có quyền thực hiện thao tác này.',
  'Resource not found.': 'Không tìm thấy dữ liệu.',
};

const FIELD: Record<string, string> = {
  name: 'Tên',
  slug: 'Đường dẫn',
  'parent id': 'Danh mục cha',
  role: 'Vai trò',
  status: 'Trạng thái',
  password: 'Mật khẩu',
  'current password': 'Mật khẩu hiện tại',
};

const label = (raw: string) => FIELD[raw] ?? raw;

/** Mẫu câu kiểm tra mặc định của Laravel (validation.php) cho các trường của khu Quản trị. */
const PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^The (.+) field is required\.$/, (m) => `Vui lòng nhập ${label(m[1]).toLowerCase()}.`],
  [/^The (.+) field must not be greater than (\d+) characters\.$/, (m) => `${label(m[1])} dài tối đa ${m[2]} ký tự.`],
  [/^The (.+) must not be greater than (\d+) characters\.$/, (m) => `${label(m[1])} dài tối đa ${m[2]} ký tự.`],
  [/^The (.+) has already been taken\.$/, (m) => `${label(m[1])} này đã được dùng.`],
  [/^The cv file field must be a file of type: .+\.$/, () => 'CV phải là tệp PDF hợp lệ.'],
  [/^The cv file field must have one of the following extensions: .+\.$/, () => 'CV phải có đuôi .pdf.'],
  [/^The cv file field must be a file\.$/, () => 'CV phải là một tệp.'],
  [/^The cv file field must not be greater than (\d+) kilobytes\.$/, (m) => `CV nặng tối đa ${Math.round(Number(m[1]) / 1024)} MB.`],
  [/^The selected (.+) is invalid\.$/, (m) => `${label(m[1])} đã chọn không hợp lệ.`],
];

/** Tiếng Việt cho một câu lỗi của máy chủ nếu đã biết, ngược lại trả lại đúng câu gốc. */
export function translateServerMessage(message: string): string {
  const text = message.trim();
  if (EXACT[text]) return EXACT[text];
  for (const [pattern, build] of PATTERNS) {
    const match = text.match(pattern);
    if (match) return build(match);
  }
  return message;
}
