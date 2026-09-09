import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'ol/ol.css';
import App from './App.vue';
import router from './router';
import { installAuthGuard } from './router/guard';
import './style.css';
import './styles/theme.css';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.use(router);
installAuthGuard(router, pinia);
app.use(ElementPlus);
app.mount('#app');
