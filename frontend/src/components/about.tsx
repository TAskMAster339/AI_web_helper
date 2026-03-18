import { useSEO } from '../hooks/useSEO';

export default function About() {
  useSEO({
    title: 'О проекте',
    description:
      'AI Web Helper — минималистичный помощник с ИИ. Узнайте о возможностях платформы и технологиях, которые мы используем.',
  });

  return (
    <main className="flex items-center justify-center min-h-[50vh]">
      <article className="max-w-xl w-full text-center glass p-10 slide-up rounded-2xl">
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          О проекте
        </h1>
        <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
          AI Web Helper — это минималистичный помощник с искусственным интеллектом, созданный для
          удобства и продуктивности.
        </p>
        <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
          Здесь вы можете быстро получать рекомендации, советы и помощь с использованием современных
          технологий AI.
        </p>
        <section aria-label="Технологии" className="text-left mt-6">
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Технологии
          </h2>
          <ul className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li>⚡ React 19 + TypeScript + Vite</li>
            <li>🐍 Django 5 + Django REST Framework</li>
            <li>🤖 Ollama — локальная LLM без отправки данных на сторонние серверы</li>
            <li>🗄️ PostgreSQL + MinIO (S3-совместимое хранилище)</li>
          </ul>
        </section>
      </article>
    </main>
  );
}
