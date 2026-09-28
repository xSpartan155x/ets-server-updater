// Screenshots in src/assets/guide: "<name>.png" for the light theme, "<name>-dark.png" for the dark one
const SHOTS = Object.fromEntries(
  Object.entries(import.meta.glob('../../assets/guide/*.png', { eager: true, query: '?url', import: 'default' }))
    .map(([file, url]) => [file.split('/').pop().replace(/\.png$/, ''), url]),
);

/** Screenshot that follows the app theme (prefers-color-scheme is driven by the theme switch). */
export default function Shot({ name, alt }) {
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={SHOTS[`${name}-dark`]} />
      <img src={SHOTS[name]} alt={alt} />
    </picture>
  );
}
