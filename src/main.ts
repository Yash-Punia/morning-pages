import './styles/fonts.css';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { startRouter } from './router.ts';
import { startServiceWorker } from './pwa/register.ts';

const app = mount(App, { target: document.getElementById('app')! });
startRouter();
startServiceWorker();

export default app;
