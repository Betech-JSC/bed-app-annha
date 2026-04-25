<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiChatService
{
    protected string $apiKey;
    protected string $model;
    protected string $baseUrl;

    public function __construct()
    {
        // Priority: Settings DB → .env config → empty
        $this->apiKey = Setting::where('key', 'gemini_api_key')->first()?->value
            ?: config('services.gemini.api_key', '');
        $this->model = Setting::where('key', 'gemini_model')->first()?->value
            ?: config('services.gemini.model', 'gemini-2.0-flash');
        $this->baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    }

    /**
     * Send a message to Gemini and get a response.
     *
     * @param string $userMessage The user's message
     * @param array $conversationHistory Previous messages [{role, content}, ...]
     * @param array $systemContext CRM context data for the AI
     * @return array ['success' => bool, 'message' => string, 'error' => string|null]
     */
    public function chat(string $userMessage, array $conversationHistory = [], array $systemContext = []): array
    {
        if (empty($this->apiKey)) {
            return [
                'success' => false,
                'message' => '',
                'error' => 'API key chưa được cấu hình. Vui lòng vào Cấu hình → Trí tuệ nhân tạo (AI) để thiết lập.',
            ];
        }

        try {
            // Build system instruction with CRM context
            $systemInstruction = $this->buildSystemInstruction($systemContext);

            // Build conversation contents for Gemini
            $contents = $this->buildContents($conversationHistory, $userMessage);

            $response = Http::timeout(30)->post(
                "{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}",
                [
                    'system_instruction' => [
                        'parts' => [['text' => $systemInstruction]],
                    ],
                    'contents' => $contents,
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'topP' => 0.95,
                        'maxOutputTokens' => 2048,
                    ],
                    'safetySettings' => [
                        ['category' => 'HARM_CATEGORY_HARASSMENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
                        ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_ONLY_HIGH'],
                        ['category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold' => 'BLOCK_ONLY_HIGH'],
                        ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
                    ],
                ]
            );

            if ($response->successful()) {
                $data = $response->json();
                $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

                if (empty($text)) {
                    return ['success' => false, 'message' => '', 'error' => 'AI không phản hồi. Vui lòng thử lại.'];
                }

                return ['success' => true, 'message' => $text, 'error' => null];
            }

            $errorBody = $response->json();
            $errorMessage = $errorBody['error']['message'] ?? 'Lỗi không xác định từ API';
            Log::error('Gemini API Error', ['status' => $response->status(), 'body' => $errorBody]);

            return ['success' => false, 'message' => '', 'error' => "Lỗi API: {$errorMessage}"];

        } catch (\Exception $e) {
            Log::error('AI Chat Service Exception', ['error' => $e->getMessage()]);
            return ['success' => false, 'message' => '', 'error' => 'Lỗi kết nối tới AI: ' . $e->getMessage()];
        }
    }

    /**
     * Build a system instruction with CRM context for the AI.
     */
    private function buildSystemInstruction(array $context): string
    {
        $companyName = config('app.name', 'Annha CRM');

        $instruction = <<<EOT
Bạn là trợ lý AI thông minh của hệ thống {$companyName} — một nền tảng quản lý xây dựng (Construction ERP).
Vai trò của bạn là hỗ trợ CEO và nhân viên quản lý dự án, tài chính, nhân sự, vật tư, thiết bị.

Nguyên tắc:
- Trả lời bằng Tiếng Việt, ngắn gọn, chuyên nghiệp
- Khi người dùng hỏi về dữ liệu hệ thống, sử dụng thông tin ngữ cảnh được cung cấp
- Đưa ra gợi ý cụ thể, có thể hành động được
- Nếu không có dữ liệu, hãy trả lời chung và gợi ý người dùng kiểm tra module tương ứng
- Sử dụng format Markdown khi cần thiết (bold, list, table)
- Không bịa số liệu — chỉ dùng dữ liệu thực từ ngữ cảnh
EOT;

        // Append live CRM context if provided
        if (!empty($context)) {
            $instruction .= "\n\n--- DỮ LIỆU HỆ THỐNG HIỆN TẠI ---\n";

            if (isset($context['projects'])) {
                $instruction .= "Dự án: Tổng {$context['projects']['total']}, " .
                    "Đang thi công: {$context['projects']['active']}, " .
                    "Hoàn thành: {$context['projects']['completed']}, " .
                    "Lập kế hoạch: {$context['projects']['planning']}\n";
            }

            if (isset($context['finance'])) {
                $instruction .= "Tài chính: Doanh thu tổng: " . number_format($context['finance']['revenue']) . "đ, " .
                    "Chi phí: " . number_format($context['finance']['costs']) . "đ, " .
                    "Lợi nhuận: " . number_format($context['finance']['profit']) . "đ, " .
                    "Biên LN: {$context['finance']['margin']}%\n";
            }

            if (isset($context['hr'])) {
                $instruction .= "Nhân sự: {$context['hr']['total']} nhân viên\n";
            }

            if (isset($context['pending'])) {
                $instruction .= "Chờ duyệt: {$context['pending']['costs']} phiếu chi, " .
                    "Tổng giá trị chờ duyệt: " . number_format($context['pending']['costs_amount']) . "đ\n";
            }

            if (isset($context['debt'])) {
                $instruction .= "Công nợ NTP: " . number_format($context['debt']['subcontractor']) . "đ\n";
            }

            $instruction .= "--- HẾT DỮ LIỆU ---\n";
        }

        return $instruction;
    }

    /**
     * Build Gemini-format contents from conversation history.
     */
    private function buildContents(array $history, string $newMessage): array
    {
        $contents = [];

        // Add conversation history (last 10 messages to keep context manageable)
        $recentHistory = array_slice($history, -10);

        foreach ($recentHistory as $msg) {
            $role = $msg['role'] === 'assistant' ? 'model' : 'user';
            $contents[] = [
                'role' => $role,
                'parts' => [['text' => $msg['content']]],
            ];
        }

        // Add the new user message
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $newMessage]],
        ];

        return $contents;
    }
}
