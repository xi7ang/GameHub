import { createApp } from 'vue'
import App from '../pages/Favorites.vue'
import '../styles/main.css'
import { startVersionWatch } from '../lib/version.js'
createApp(App).mount('#app')

startVersionWatch()
