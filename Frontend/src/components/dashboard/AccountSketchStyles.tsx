import { SKETCH_CARD_PATH, SKETCH_BUTTON_PATH } from "@/components/ui/SketchBorders";

// Reuse the landing page paths, including non-scaling ink strokes at every screen size.
function image(path: string, viewBox: string, fill: string, stroke: string, width: number) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewBox + '" preserveAspectRatio="none"><path d="' + path + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  // Encoded data URLs need no quotes; keep style text identical during SSR hydration.
  return 'url(data:image/svg+xml,' + encodeURIComponent(svg) + ')';
}
export function AccountSketchStyles() {
  const variables = [['card', SKETCH_CARD_PATH, '0 0 400 300', 1.85], ['button', SKETCH_BUTTON_PATH, '0 0 200 50', 1.75]] as const;
  return <style>{':root {' + variables.map(([name, path, box, width]) =>
    '--sketch-' + name + '-mask:' + image(path, box, 'white', 'none', 0) + ';' +
    '--sketch-' + name + '-border:' + image(path, box, 'none', '#33302B', width) + ';'
  ).join('') + '}'}</style>;
}

