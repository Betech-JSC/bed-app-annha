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
  title: title => title ? `${title} - BED CRM` : 'BED CRM',
  setup({ el, App, props, plugin }) {
    const app = createApp({ render: () => h(App, props) })
    
    // Global permission helper
    app.config.globalProperties.$can = (perm) => {
      const user = props.initialPage.props.auth?.user
      if (!user) return false
      if (user.super_admin) return true
      return (user.permissions || []).includes(perm)
    }

    app.use(plugin)
      .use(Antd)
      .mount(el)
  },
})
