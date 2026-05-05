/**
 * useSEO — sets document <title>, meta description, canonical URL,
 * Open Graph and Twitter Card tags for the current page.
 *
 * Uses vanilla DOM manipulation so no extra library is required.
 * Call it at the top level of every page component.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'AI Web Helper';
const DEFAULT_DESCRIPTION =
  'Минималистичный AI-помощник для поиска товаров, рекомендаций и продуктивной работы.';
const DEFAULT_IMAGE = 'https://ai-web-helper.example.com/og-default.png';
const BASE_URL = import.meta.env.VITE_FRONTEND_URL ?? 'http://localhost:3000';

export interface SEOOptions {
  title?: string;
  description?: string;
  /** Absolute canonical URL. Defaults to current origin + pathname. */
  canonical?: string;
  /** og:image absolute URL */
  image?: string;
  /** 'website' | 'article' | 'product' */
  type?: string;
  /** When true, adds noindex,nofollow robots meta */
  noIndex?: boolean;
  /** Structured data JSON-LD object */
  jsonLd?: object;
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(data: object) {
  const id = 'structured-data-jsonld';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd() {
  document.getElementById('structured-data-jsonld')?.remove();
}

export function useSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
  jsonLd,
}: SEOOptions = {}) {
  const location = useLocation();
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = canonical ?? `${BASE_URL}${location.pathname}`;

  useEffect(() => {
    // Title
    document.title = pageTitle;

    // Basic meta
    setMeta('description', description);
    setMeta('robots', noIndex ? 'noindex,nofollow' : 'index,follow');

    // Canonical
    setLink('canonical', canonicalUrl);

    // Open Graph
    setMeta('og:title', pageTitle, true);
    setMeta('og:description', description, true);
    setMeta('og:url', canonicalUrl, true);
    setMeta('og:type', type, true);
    setMeta('og:image', image, true);
    setMeta('og:site_name', SITE_NAME, true);
    setMeta('og:locale', 'ru_RU', true);

    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', pageTitle);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

    // JSON-LD
    if (jsonLd) {
      setJsonLd(jsonLd);
    } else {
      removeJsonLd();
    }
  }, [pageTitle, description, canonicalUrl, image, type, noIndex, jsonLd]);
}
