import { createAppleSplashScreens, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Icons and Apple splash screens from one SVG (TDD 10.2). iPads only: the app is iPad-first,
// and every splash image is precached, so iPhone sizes would only add weight.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.4,
        resizeOptions: { background: '#F7F3EA', fit: 'contain' },
        darkResizeOptions: { background: '#1B1C1E', fit: 'contain' },
      },
      ['iPad Pro 12.9"', 'iPad Pro 11"', 'iPad Air 13"', 'iPad Air 11"', 'iPad Air 10.9"', 'iPad 11"', 'iPad 10.2"', 'iPad mini 8.3"'],
    ),
  },
  images: ['public/icon.svg'],
});
