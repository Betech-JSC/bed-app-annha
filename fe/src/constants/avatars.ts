// Demo avatar URL - sử dụng khi user chưa có avatar
export const DEMO_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFo5XDeGQQixCh592qCFO1BMjesd1MZYmbBe-vvMxPKdvwpOWnDZAf5B4lVwDge5nGrI1PY0IPj_XlKGudJV8BR605QD4mXxJaoSOnCLFtAXAmsiP_UdmQjyLOiDIgnX9oYHMVaGN5ze6QFC1b8CFh14sj4c_4lKg8Mf8c4JjN8WZENlqsB9wXW4IZl4WpLGmxR6I75Qla6G9TDvud5DkN3GExhodb6zDKbwkb3HHyphaWXV_7ONs_JyP_blfhAUjgxop2VuqCcrrC';

/**
 * Helper function để lấy avatar URL với fallback về demo avatar
 * @param avatar - Avatar URL từ API (có thể là null, undefined, empty string, hoặc relative path)
 * @param baseUrl - Base URL của API (để convert relative path thành full URL)
 * @returns Avatar URL hoặc DEMO_AVATAR nếu không có
 */
export function getAvatarUrl(avatar: string | null | undefined, baseUrl?: string): string {
    if (!avatar) {
        return DEMO_AVATAR;
    }

    // Nếu là relative path (storage/ hoặc avatars/)
    if (avatar.startsWith('storage/') || avatar.startsWith('avatars/')) {
        const apiBaseUrl = baseUrl || process.env.API_URL || 'http://localhost:8000';
        return `${apiBaseUrl}/storage/${avatar.replace('storage/', '')}`;
    }

    // Nếu là full URL
    if (avatar.startsWith('http')) {
        return avatar;
    }

    // Fallback về demo avatar
    return DEMO_AVATAR;
}

