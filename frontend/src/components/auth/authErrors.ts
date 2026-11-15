// Chỉ đổi chữ hiển thị: nhận biết lỗi theo trạng thái và nội dung tiếng Anh của Laravel, không đổi mã lỗi hay logic.
export const GENERIC_ERROR = 'Không thực hiện được, hãy thử lại sau.';

type ApiError = { status?: number; message?: string; errors?: Record<string, string[]> };

/** True when the API refused the email or password (not a network, throttle or Google error). */
export function isCredentialError(error: unknown): boolean {
  const e = error as ApiError;
  return e.status === 401 || e.status === 422 || Boolean(e.errors?.email);
}

export function loginErrorText(error: unknown): string {
  const e = error as ApiError;
  if (isCredentialError(error)) return 'Email hoặc mật khẩu không đúng.';
  if (e.status === 429) return 'Thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.';
  return GENERIC_ERROR;
}

const RULES: [RegExp, string][] = [
  [/already been taken|already (in use|exists)/i, 'Email này đã được sử dụng.'],
  [/domain|not allowed|not approved/i, 'Tên miền email này không được phép đăng ký.'],
  [/confirmation does not match|do(es)? not match/i, 'Mật khẩu nhập lại không khớp.'],
  [/at least 8|min(imum)? .*8|too short/i, 'Mật khẩu phải có ít nhất 8 ký tự.'],
  [/required/i, 'Vui lòng điền thông tin này.'],
  [/valid email/i, 'Email không hợp lệ.'],
  [/may not be greater|must not be greater/i, 'Giá trị quá dài.'],
];

/** Một câu tiếng Việt cho lỗi của một ô; lỗi chưa biết thì dùng câu chung. */
export function registerFieldError(message: string): string {
  return RULES.find(([re]) => re.test(message))?.[1] ?? GENERIC_ERROR;
}

export function registerErrorText(error: unknown): string {
  const e = error as ApiError;
  if (e.status === 429) return 'Thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.';
  return e.errors ? 'Vui lòng kiểm tra lại các ô bên dưới.' : GENERIC_ERROR;
}
