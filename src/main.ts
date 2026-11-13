import { mount } from 'svelte';
import App from './App.svelte';
import { startServiceWorker } from './pwa/register.ts';

const app = mount(App, { target: document.getElementById('app')! });
startServiceWorker();

export default app;
