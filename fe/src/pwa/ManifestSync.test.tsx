// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ManifestSync from './ManifestSync';

function href() {
  return document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.getAttribute('href');
}

describe('ManifestSync', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('mount ở /toi/cham-cong → manifest chấm công', () => {
    render(
      <MemoryRouter initialEntries={['/toi/cham-cong']}>
        <ManifestSync />
      </MemoryRouter>,
    );
    expect(href()).toBe('/manifest.chamcong.webmanifest');
  });

  it('mount ở / → manifest mặc định', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <ManifestSync />
      </MemoryRouter>,
    );
    expect(href()).toBe('/manifest.webmanifest');
  });
});
