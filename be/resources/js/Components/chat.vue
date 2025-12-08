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

// props: có thể truyền từ server hoặc để rỗng để fallback query string
const props = defineProps({
  myId: Number,
  partnerId: Number,
})

const text = ref('')
const messages = ref([])

// lấy ID từ props hoặc từ query string nếu props chưa có
const myId = ref(props.myId || null)
const partnerId = ref(props.partnerId || null)

if (!myId.value || !partnerId.value) {
  const params = new URLSearchParams(window.location.search)
  if (!myId.value) myId.value = params.get('myId')
  if (!partnerId.value) partnerId.value = params.get('partnerId')
}

onMounted(() => {
  console.log('Subscribing channel: chat.' + partnerId.value + '.' + myId.value)

  window.Echo.channel(`chat.${partnerId.value}.${myId.value}`).listen('.ChatMessage', (e) => {
    console.log('Received message:', e)
    messages.value.push(e)
  })
})

function send() {
  if (!text.value) return
  axios.post('/chat/send', {
    from: myId.value,
    to: partnerId.value,
    text: text.value,
  })
  messages.value.push({
    from: myId.value,
    to: partnerId.value,
    text: text.value,
  })
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
