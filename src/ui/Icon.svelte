<script lang="ts" module>
  // Authored icons: one 24 px grid, one 1.75 stroke, round joins. Decorative by default;
  // the control that holds an icon carries the accessible name.
  const PATHS = {
    today: 'M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z M8.5 8.5h7 M8.5 12h7 M8.5 15.5c1.2-1.4 2.2-1.4 3 0s1.8 1.4 3 0',
    library: 'M4.5 4.5h3v15h-3z M9.5 4.5h3v15h-3z M14.6 5.6l2.9-.8 3.9 14.5-2.9.8z M4.5 8h3 M9.5 8h3',
    settings: 'M4 7h9 M17 7h3 M17 7a2 2 0 1 1-4 0a2 2 0 1 1 4 0 M4 17h3 M11 17h9 M11 17a2 2 0 1 1-4 0a2 2 0 1 1 4 0',
    'rail-open': 'M4.5 5.5h15v13h-15z M9.5 5.5v13 M13 10l2 2-2 2',
    'rail-close': 'M4.5 5.5h15v13h-15z M9.5 5.5v13 M15 10l-2 2 2 2',
    'arrow-right': 'M5 12h14 M13 6l6 6-6 6',
    eraser: 'M8.5 19.5h11 M4.9 14.6l8.5-8.5a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8l-7.6 7.6a2 2 0 0 1-1.4.6H8.5a2 2 0 0 1-1.4-.6l-2.2-2.2a1.7 1.7 0 0 1 0-2.4Z M9.4 10.1l5.5 5.5',
    undo: 'M9 14l-4-4 4-4 M5 10h9a5 5 0 0 1 0 10h-3',
    redo: 'M15 14l4-4-4-4 M19 10h-9a5 5 0 0 0 0 10h3',
    grip: 'M9 6.5h.01 M15 6.5h.01 M9 12h.01 M15 12h.01 M9 17.5h.01 M15 17.5h.01',
    // Fold toward the edge the pill is docked to (not "×", which reads as close or delete).
    'fold-left': 'M14.5 6.5L9 12l5.5 5.5',
    'fold-right': 'M9.5 6.5L15 12l-5.5 5.5',
    'fold-top': 'M6.5 14.5L12 9l5.5 5.5',
  } as const;
  export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
  let { name, size = 24, weight = 1.75 }: { name: IconName; size?: number; weight?: number } = $props();
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={weight}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <path d={PATHS[name]} />
</svg>

<style>
  .icon {
    flex: none;
    display: block;
  }
</style>
