export default function About() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="max-w-xl w-full text-center glass p-10 slide-up">
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          О проекте
        </h1>
        <p className="text-base mb-4" style={{ color: 'var(--text-secondary)' }}>
          AI Web Helper — это минималистичный помощник с искусственным интеллектом, созданный для
          удобства и продуктивности.
        </p>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Здесь вы можете быстро получать рекомендации, советы и помощь с использованием современных
          технологий AI.
        </p>
      </div>
    </div>
  );
}
