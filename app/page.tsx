// Файл: app/page.tsx
import type { Metadata } from 'next';
// Убедись, что импорт APP_URL работает или используй process.env напрямую
// import { APP_URL } from "@/lib/constants"; // Убери, если константы не нужны здесь

// Получаем базовый URL из переменной окружения
const appUrl = process.env.NEXT_PUBLIC_URL; // Читаем напрямую

// Компонент главной страницы (будет виден только в браузере)
export default function Page() {
  // Можно оставить здесь минимальное содержимое или то, что было в шаблоне
  return (
    <div>
      <h1>Monad Wishlist Frame</h1>
      <p>This app provides a Farcaster Frame. Please interact with it within a Farcaster client by posting the URL: {appUrl}</p>
      {/* Можно удалить компонент <App /> из шаблона, если он больше не нужен */}
      {/* <App /> */}
    </div>
  );
}

// --- Генерация метаданных для Farcaster Frame ---
// Асинхронная функция generateMetadata, чтобы получить APP_URL
export async function generateMetadata(): Promise<Metadata> {

  // Проверка, что URL доступен (хотя на Vercel он должен быть)
  if (!appUrl) {
    console.error("ERROR: NEXT_PUBLIC_URL is not available in generateMetadata!");
    // Возвращаем минимальные метаданные или выбрасываем ошибку
    return {
        title: "Monad Wishlist Frame (Error)",
        description: "Configuration error: App URL not set.",
    }
  }

  // --- Определяем мета-теги для НАЧАЛЬНОГО состояния нашего Wishlist Frame ---
  return {
    // Стандартные метаданные
    title: 'Monad Wishlist Frame',
    description: 'Create your wishlist on Monad via Farcaster Frames.',
    // Метаданные Open Graph (для превью ссылок в других местах)
    openGraph: {
        title: 'Monad Wishlist Frame',
        // Начальная картинка вишлиста
        images: [`${appUrl}/default-wishlist.png`], // Используем массив images
    },
    // Другие мета-теги, включая Farcaster Frame
    other: {
        // --- Frame Specific Metatags ---

        // Указываем версию Frame
        'fc:frame': 'vNext',

        // Начальная картинка нашего вишлиста
        // (убедись, что /public/default-wishlist.png существует)
        'fc:frame:image': `${appUrl}/default-wishlist.png`,

        // Соотношение сторон картинки (опционально, 1.91:1 стандарт)
        // 'fc:frame:image:aspect_ratio': '1.91:1',

        // Поле для ввода текста для добавления желания
        'fc:frame:input:text': 'Enter your wish...',

        // САМОЕ ВАЖНОЕ: URL, куда Farcaster отправит POST-запрос при нажатии кнопки
        'fc:frame:post_url': `${appUrl}/api/frame`,

        // Определяем кнопки для начального состояния
        // Кнопка 1: Посмотреть желания (индекс 1)
        'fc:frame:button:1': 'View Wishes',
        // Кнопка 2: Добавить желание (индекс 2) - будет использовать текст из input
        'fc:frame:button:2': 'Add Wish',
        // Можно добавить еще кнопки, если нужно (до 4х)
        // 'fc:frame:button:3': '...',
    },
  };
}