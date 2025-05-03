import type { Metadata } from 'next';

// Прочитаем базовый URL из переменных окружения
const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'; // Убедись, что это правильная переменная

export const metadata: Metadata = {
  title: 'Monad Wishlist Frame', // Заголовок для обычных ссылок
  description: 'Create and manage your wishlist on Monad via Farcaster Frames.',
  // --- OG Tags для обычных превью ---
  openGraph: {
    title: 'Monad Wishlist Frame',
    description: 'Create and manage your wishlist on Monad via Farcaster Frames.',
    images: [`${appUrl}/default-wishlist.png`], // Ссылка на твою картинку по умолчанию
  },
  // --- Farcaster Frame мета-теги ---
  other: {
    // Обязательные теги для Farcaster Frame
    'fc:frame': 'vNext',
    'fc:frame:image': `${appUrl}/default-wishlist.png`, // Картинка первого кадра
    // URL, куда будут отправляться POST-запросы при нажатии кнопок
    'fc:frame:post_url': `${appUrl}/api/frame`,
    // Пример кнопки (нужна хотя бы одна для интерактивности)
    'fc:frame:button:1': 'View Wishlist',
    // Можно добавить поле ввода, если хочешь его на первом кадре
     'fc:frame:input:text': 'Enter your wish...',
     'fc:frame:button:2': 'Add Wish', // Добавим кнопку добавления сразу
     // Добавлять 'fc:frame:state' здесь не нужно, он будет в ответах от /api/frame
  },
};

// Основной компонент страницы - его содержимое НЕ будет видно во Frame,
// но может быть полезно для обычных браузеров
export default function Page() {
  return (
    <div>
      <h1>Monad Wishlist Farcaster Frame</h1>
      <p>This page provides the necessary meta tags for the Farcaster Frame.</p>
      <p>Open this URL in a Farcaster client (like Warpcast) or a Frame Validator to interact with the Wishlist.</p>
      {/* Можешь оставить здесь контент из шаблона или сделать его проще */}
    </div>
  );
}