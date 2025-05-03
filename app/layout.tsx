// Файл: app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
// Оставляем FrameProvider, если он нужен для других частей шаблона MiniApp
import { FrameProvider } from "@/components/farcaster-provider";
import "./globals.css";

// Настройка шрифта (стандартно для Next.js)
const inter = Inter({ subsets: ["latin"] });

// --- Получаем базовый URL ---
// Важно, чтобы NEXT_PUBLIC_URL был правильно установлен в .env.local / Vercel
const appUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

// --- Метаданные для поисковиков, соцсетей и заголовка вкладки ---
// НЕ ВКЛЮЧАЕМ сюда 'fc:frame:*' теги, так как добавим их вручную ниже
export const metadata: Metadata = {
  // Название твоего приложения
  title: "Monad Wishlist Frame",
  // Описание твоего приложения
  description: "Create and manage your wishlist on Monad via Farcaster Frames.",
  // Мета-теги для красивых превью ссылок (Open Graph / Facebook, etc.)
  openGraph: {
    title: "Monad Wishlist Frame",
    description: "Create and manage your wishlist on Monad via Farcaster Frames.",
    // Убедись, что картинка лежит в /public/default-wishlist.png
    images: [`${appUrl}/default-wishlist.png`],
  },
  // Мета-теги для Twitter превью
  twitter: {
    card: "summary_large_image",
    title: "Monad Wishlist Frame",
    description: "Create and manage your wishlist on Monad via Farcaster Frames.",
    images: [`${appUrl}/default-wishlist.png`],
  },
  // Здесь можно добавить и другие мета-теги, например, иконку
  icons: {
    icon: '/favicon.ico',
  },
};

// --- Корневой Layout Компонент ---
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* --- Farcaster Frame Мета-теги --- */}
        {/* Добавляем вручную с атрибутом 'property' */}
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${appUrl}/default-wishlist.png`} />
        <meta property="fc:frame:post_url" content={`${appUrl}/api/frame`} />
        {/* Добавь кнопки и поля ввода, как они должны выглядеть НА ПЕРВОМ КАДРЕ */}
        {/* Пример: Поле ввода и кнопка "Add" + кнопка просмотра */}
        <meta property="fc:frame:input:text" content="Enter your wish..." />
        <meta property="fc:frame:button:1" content="Add Wish" />
        {/* Нумерация кнопок идет по порядку: 1, 2, 3... */}
        <meta property="fc:frame:button:2" content="View Next" />
        {/*
          Другие возможные теги (добавляй по необходимости):
          <meta property="fc:frame:image:aspect_ratio" content="1.91:1" /> или "1:1"
          <meta property="fc:frame:button:3" content="..." />
          <meta property="fc:frame:button:3:action" content="post_redirect" />
          <meta property="fc:frame:button:4" content="..." />
          <meta property="fc:frame:state" content="..." /> // Обычно state добавляется в ответах от post_url
        */}
        {/*
          Важно: Next.js автоматически добавит сюда <title>, <meta name="description">
          и другие теги из объекта 'metadata', определенного выше.
          Также сюда попадут ссылки на CSS и шрифты.
        */}
      </head>
      <body className={inter.className}>
        {/* FrameProvider оставляем на случай, если он используется для SDK MiniApp */}
        <FrameProvider>{children}</FrameProvider>
      </body>
    </html>
  );
}