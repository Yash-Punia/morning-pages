// Spike index. Each spike adds itself here and to vite.config.ts build inputs.
const spikes: [href: string, label: string][] = [
  ['/ink/', 'S1 · Ink latency (and S1b iOS suppression)'],
  ['/store/', 'S2 · IndexedDB durability torture'],
  ['/store/codec.html', 'S2b · Point codec size on real pages'],
  ['/pwa/', 'S3 · Home Screen install, persist and CSP'],
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
