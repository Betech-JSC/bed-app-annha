import '../css/app.css'
import './echo'

import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./Pages/**/*.vue', { eager: true })
    return pages[`./Pages/${name}.vue`]
  },
  title: title => title ? `${title} - SkySend` : 'SkySend',
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(Antd)
      .mount(el)
  },
})
