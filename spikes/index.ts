// Spike index. Each spike adds itself here and to vite.config.ts build inputs.
const spikes: [href: string, label: string][] = [
  ['/ink/', 'S1 · Ink latency (and S1b iOS suppression)'],
];

document.getElementById('spikes')!.append(
  ...spikes.map(([href, label]) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    li.append(a);
    return li;
  }),
);
