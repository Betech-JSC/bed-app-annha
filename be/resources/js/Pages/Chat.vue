<template>
  <div class="chat">
    <h2>Chat {{ myId }} ↔ {{ partnerId }}</h2>
    <div v-for="(m, i) in messages" :key="i">
      <strong>{{ m.from }}:</strong> {{ m.text }}
    </div>
    <input v-model="text" @keyup.enter="send" placeholder="Gõ tin nhắn..." />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  myId: Number, // id của mình
  partnerId: Number, // id của người chat cùng
})

const text = ref('')
const messages = ref([])

onMounted(() => {
  // Lắng nghe kênh chat.myId.partnerId
  window.Echo.channel(`chat.${props.partnerId}.${props.myId}`).listen('.ChatMessage', (e) => {
    messages.value.push(e)
  })
})

function send() {
  if (!text.value) return
  axios.post('/chat/send', {
    from: props.myId,
    to: props.partnerId,
    text: text.value,
  })
  // hiện ngay trên giao diện (không chờ phản hồi)
  messages.value.push({ from: props.myId, to: props.partnerId, text: text.value })
  text.value = ''
}
</script>

<style scoped>
.chat {
  max-width: 400px;
  margin: 20px auto;
  border: 1px solid #ddd;
  padding: 10px;
}
</style>
