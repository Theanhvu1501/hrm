import { parseYoutubeId } from './youtube.util';

describe('parseYoutubeId', () => {
  it('watch', () =>
    expect(
      parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBe('dQw4w9WgXcQ'));
  it('short', () =>
    expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    ));
  it('embed', () =>
    expect(parseYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    ));
  it('shorts', () =>
    expect(parseYoutubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    ));
  it('invalid', () =>
    expect(parseYoutubeId('https://example.com')).toBeNull());
});
