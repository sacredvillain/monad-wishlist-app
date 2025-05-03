// Файл: app/page.tsx
import type { Metadata } from 'next';

// Прочитаем базовый URL из переменных окружения
// Оставляем это, так как используется для openGraph.images
const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  // Оставляем стандартные метаданные
  title: 'Monad Wishlist Frame',
  description: 'Create and manage your wishlist on Monad via Farcaster Frames.',
  // --- OG Tags для обычных превью ---
  openGraph: {
    title: 'Monad Wishlist Frame',
    description: 'Create and manage your wishlist on Monad via Farcaster Frames.',
    images: [`${appUrl}/default-wishlist.png`], // Оставляем
  },
  // --- Farcaster Frame мета-теги ---
  // !!! СЕКЦИЯ 'other: { ... }' УДАЛЕНА ОТСЮДА !!!
  // Мы теперь добавляем fc:frame:* теги вручную в layout.tsx
};

// Основной компонент страницы оставляем без изменений
export default function Page() {
  return (
    <div>
      <h1>Monad Wishlist Farcaster Frame</h1>
      <p>This page provides the necessary meta tags for the Farcaster Frame.</p>
      <p>Open this URL in a Farcaster client (like Warpcast) or a Frame Validator to interact with the Wishlist.</p>
    </div>
  );
}