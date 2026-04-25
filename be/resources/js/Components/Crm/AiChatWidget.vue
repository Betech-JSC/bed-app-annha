<template>
  <!-- Floating Chat Button -->
  <div class="ai-chat-fab" :class="{ 'ai-chat-fab--open': isOpen }" @click="toggleChat">
    <transition name="fab-icon" mode="out-in">
      <CloseOutlined v-if="isOpen" key="close" style="font-size: 20px;" />
      <RobotOutlined v-else key="robot" style="font-size: 22px;" />
    </transition>
    <span v-if="!isOpen" class="ai-chat-fab__pulse"></span>
  </div>

  <!-- Chat Window -->
  <transition name="chat-window">
    <div v-if="isOpen" class="ai-chat-window">
      <!-- Header -->
      <div class="ai-chat-header">
        <div class="flex items-center gap-3">
          <div class="ai-chat-header__avatar">
            <RobotOutlined style="font-size: 18px;" />
          </div>
          <div>
            <div class="ai-chat-header__title">Trợ lý AI</div>
            <div class="ai-chat-header__sub">
              <span class="ai-chat-header__dot"></span>
              Annha CRM Assistant
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <a-tooltip title="Xóa hội thoại">
            <button class="ai-chat-header__btn" @click.stop="clearChat">
              <DeleteOutlined style="font-size: 14px;" />
            </button>
          </a-tooltip>
          <button class="ai-chat-header__btn" @click.stop="toggleChat">
            <MinusOutlined style="font-size: 14px;" />
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div ref="messagesRef" class="ai-chat-messages">
        <!-- Welcome Message -->
        <div v-if="messages.length === 0" class="ai-chat-welcome">
          <div class="ai-chat-welcome__icon">
            <RobotOutlined style="font-size: 32px;" />
          </div>
          <h4 class="ai-chat-welcome__title">Xin chào! 👋</h4>
          <p class="ai-chat-welcome__text">Tôi là trợ lý AI của Annha CRM. Hãy hỏi tôi về dự án, tài chính, nhân sự hoặc bất kỳ thông tin nào trong hệ thống.</p>
          <div class="ai-chat-suggestions">
            <button v-for="s in suggestions" :key="s" class="ai-chat-suggestion" @click="sendSuggestion(s)">
              {{ s }}
            </button>
          </div>
        </div>

        <!-- Chat Messages -->
        <div v-for="(msg, idx) in messages" :key="idx" class="ai-chat-msg" :class="`ai-chat-msg--${msg.role}`">
          <div v-if="msg.role === 'assistant'" class="ai-chat-msg__avatar">
            <RobotOutlined style="font-size: 12px;" />
          </div>
          <div v-if="msg.role === 'assistant'" class="ai-chat-msg__bubble" v-html="renderMarkdown(msg.content)"></div>
          <div v-else class="ai-chat-msg__bubble">{{ msg.content }}</div>
        </div>

        <!-- Typing Indicator -->
        <div v-if="isLoading" class="ai-chat-msg ai-chat-msg--assistant">
          <div class="ai-chat-msg__avatar">
            <RobotOutlined style="font-size: 12px;" />
          </div>
          <div class="ai-chat-msg__bubble ai-chat-typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="ai-chat-input">
        <input
          ref="inputRef"
          v-model="inputText"
          class="ai-chat-input__field"
          placeholder="Nhập câu hỏi..."
          :disabled="isLoading"
          @keydown.enter.prevent="sendMessage"
        />
        <button
          class="ai-chat-input__btn"
          :disabled="!inputText.trim() || isLoading"
          @click="sendMessage"
        >
          <SendOutlined style="font-size: 16px;" />
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { RobotOutlined, CloseOutlined, SendOutlined, DeleteOutlined, MinusOutlined } from '@ant-design/icons-vue'
import axios from 'axios'

const isOpen = ref(false)
const inputText = ref('')
const isLoading = ref(false)
const messages = ref([])
const messagesRef = ref(null)
const inputRef = ref(null)

const suggestions = [
  'Tổng quan dự án hiện tại?',
  'Tình hình tài chính tháng này?',
  'Chi phí nào đang chờ duyệt?',
  'Công nợ nhà thầu phụ?',
]

const toggleChat = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => inputRef.value?.focus())
  }
}

const clearChat = () => {
  messages.value = []
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

const sendSuggestion = (text) => {
  inputText.value = text
  sendMessage()
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isLoading.value) return

  // Add user message
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  isLoading.value = true
  scrollToBottom()

  try {
    // Build history (exclude the message we just added — it goes as 'message')
    const history = messages.value.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content,
    }))

    const { data } = await axios.post('/ai-chat/send', {
      message: text,
      history,
    })

    if (data.success) {
      messages.value.push({ role: 'assistant', content: data.message })
    } else {
      messages.value.push({ role: 'assistant', content: `⚠️ ${data.error || 'Lỗi không xác định'}` })
    }
  } catch (err) {
    const errMsg = err.response?.data?.message || err.message || 'Không thể kết nối tới server'
    messages.value.push({ role: 'assistant', content: `⚠️ ${errMsg}` })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// Simple markdown rendering (bold, italic, lists, code)
const renderMarkdown = (text) => {
  if (!text) return ''
  return text
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="ai-code">$1</pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul class="ai-list">$1</ul>')
    // Line breaks
    .replace(/\n/g, '<br>')
}

watch(messages, scrollToBottom, { deep: true })
</script>

<style scoped>
/* ─── FAB Button ─── */
.ai-chat-fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10000;
  box-shadow: 0 4px 20px rgba(27, 79, 114, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.ai-chat-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(27, 79, 114, 0.55);
}
.ai-chat-fab--open {
  background: linear-gradient(135deg, #374151, #4B5563);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.ai-chat-fab__pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(46, 134, 193, 0.5);
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

/* ─── Chat Window ─── */
.ai-chat-window {
  position: fixed;
  bottom: 96px;
  right: 28px;
  width: 400px;
  max-height: 560px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ─── Header ─── */
.ai-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #0C1B2A, #1B4F72);
  flex-shrink: 0;
}
.ai-chat-header__avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.ai-chat-header__title { font-size: 14px; font-weight: 700; color: #fff; }
.ai-chat-header__sub { font-size: 11px; color: rgba(255, 255, 255, 0.5); display: flex; align-items: center; gap: 4px; }
.ai-chat-header__dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; display: inline-block; }
.ai-chat-header__btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.ai-chat-header__btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

/* ─── Messages ─── */
.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 280px;
  max-height: 380px;
  scroll-behavior: smooth;
}

.ai-chat-welcome {
  text-align: center;
  padding: 20px 8px;
}
.ai-chat-welcome__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(27, 79, 114, 0.1), rgba(46, 134, 193, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  color: #1B4F72;
}
.ai-chat-welcome__title { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 6px; }
.ai-chat-welcome__text { font-size: 12px; color: #6b7280; line-height: 1.6; margin-bottom: 16px; }

.ai-chat-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.ai-chat-suggestion {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}
.ai-chat-suggestion:hover {
  background: #1B4F72;
  color: white;
  border-color: #1B4F72;
}

/* ─── Message Bubbles ─── */
.ai-chat-msg {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: flex-end;
}
.ai-chat-msg--user {
  flex-direction: row-reverse;
}
.ai-chat-msg__avatar {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-chat-msg__bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}
.ai-chat-msg--user .ai-chat-msg__bubble {
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  color: white;
  border-bottom-right-radius: 4px;
}
.ai-chat-msg--assistant .ai-chat-msg__bubble {
  background: #f3f4f6;
  color: #1f2937;
  border-bottom-left-radius: 4px;
}

/* ─── Typing Indicator ─── */
.ai-chat-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 18px !important;
}
.ai-chat-typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing-bounce 1.4s infinite ease-in-out;
}
.ai-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.ai-chat-typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-6px); opacity: 1; }
}

/* ─── Input ─── */
.ai-chat-input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid #f3f4f6;
  background: #fafbfc;
  flex-shrink: 0;
}
.ai-chat-input__field {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  outline: none;
  background: white;
  transition: border-color 0.2s;
}
.ai-chat-input__field:focus {
  border-color: #1B4F72;
  box-shadow: 0 0 0 3px rgba(27, 79, 114, 0.08);
}
.ai-chat-input__btn {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.ai-chat-input__btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(27, 79, 114, 0.3);
}
.ai-chat-input__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ─── Markdown styles inside bubbles ─── */
.ai-chat-msg__bubble :deep(strong) { font-weight: 700; }
.ai-chat-msg__bubble :deep(.ai-list) { margin: 4px 0; padding-left: 16px; }
.ai-chat-msg__bubble :deep(.ai-list li) { margin-bottom: 2px; }
.ai-chat-msg__bubble :deep(.ai-code) { background: #1e293b; color: #e2e8f0; padding: 8px 12px; border-radius: 8px; font-size: 11px; margin: 6px 0; overflow-x: auto; white-space: pre-wrap; }
.ai-chat-msg__bubble :deep(.ai-inline-code) { background: rgba(0,0,0,0.06); padding: 1px 5px; border-radius: 4px; font-size: 12px; }

/* ─── Transitions ─── */
.chat-window-enter-active { animation: chat-in 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.chat-window-leave-active { animation: chat-in 0.25s cubic-bezier(0.4, 0, 1, 1) reverse; }

@keyframes chat-in {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.fab-icon-enter-active, .fab-icon-leave-active {
  transition: all 0.2s ease;
}
.fab-icon-enter-from { transform: rotate(-90deg) scale(0); opacity: 0; }
.fab-icon-leave-to { transform: rotate(90deg) scale(0); opacity: 0; }

/* ─── Responsive ─── */
@media (max-width: 480px) {
  .ai-chat-window {
    right: 8px;
    left: 8px;
    bottom: 88px;
    width: auto;
    max-height: 75vh;
  }
  .ai-chat-fab {
    bottom: 16px;
    right: 16px;
    width: 48px;
    height: 48px;
  }
}
</style>
