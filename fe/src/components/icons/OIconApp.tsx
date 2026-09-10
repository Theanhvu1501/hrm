import { quyCachO } from './quyCachIconApp';
import { layGlyphApp } from './AppGlyphs';

/**
 * Ô icon của một app, dựng theo quy cách trong `quyCachIconApp.ts`.
 *
 * Mọi chỗ hiện icon app đều phải đi qua đây — rải màu và bo góc thẳng vào chỗ
 * gọi thì mỗi lần thêm một chỗ là một lần lệch.
 *
 * BẢN SAO Ở: identity-service/portal/src/components/OIconApp.tsx
 */
export function OIconApp({
  appId,
  size,
  className,
}: {
  appId: string;
  size: number;
  className?: string;
}) {
  const { boGoc, glyph, nen, bong } = quyCachO(appId, size);
  const Glyph = layGlyphApp(appId);

  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: boGoc,
        background: nen,
        boxShadow: bong,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Glyph size={glyph} />
    </span>
  );
}

export default OIconApp;
