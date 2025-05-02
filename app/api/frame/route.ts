// Файл: app/api/frame/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { NeynarAPIClient, Message } from "@neynar/nodejs-sdk"; // Импорт из Neynar SDK

// --- Конфигурация ---
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "";
// Приватный ключ для отправки транзакций (запись в контракт)
const SIGNER_PRIVATE_KEY = process.env.PRIVATE_KEY || "";
// Адрес нашего контракта Wishlist
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
// URL нашего приложения (для post_url и image)
const HOST_URL = process.env.NEXT_PUBLIC_HOST_URL || "http://localhost:3000"; // Используй переменную окружения

// ABI (Application Binary Interface) нашего контракта Wishlist
// Скопируй его из Remix: Вкладка Solidity Compiler -> кнопка "ABI" под деталями компиляции
const contractABI = [
    [
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "fid",
                    "type": "uint256"
                },
                {
                    "internalType": "string",
                    "name": "newItem",
                    "type": "string"
                }
            ],
            "name": "addItem",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "uint256",
                    "name": "fid",
                    "type": "uint256"
                },
                {
                    "indexed": false,
                    "internalType": "string",
                    "name": "item",
                    "type": "string"
                }
            ],
            "name": "ItemAdded",
            "type": "event"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "fid",
                    "type": "uint256"
                }
            ],
            "name": "getWishlistCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "fid",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "index",
                    "type": "uint256"
                }
            ],
            "name": "getWishlistItem",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                },
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "userWishlists",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    // Пример:
    // { "inputs": [ ... ], "name": "ItemAdded", "type": "event" },
    // { "inputs": [ ... ], "name": "addItem", ... },
    // { "inputs": [ ... ], "name": "getWishlistCount", ... },
    // { "inputs": [ ... ], "name": "getWishlistItem", ... },
    // { "inputs": [ ... ], "name": "userWishlists", ... }
];

// --- Инициализация ---
if (!NEYNAR_API_KEY) throw new Error("NEYNAR_API_KEY is not set");
const neynarClient = new NeynarAPIClient(NEYNAR_API_KEY);

if (!MONAD_RPC_URL) throw new Error("MONAD_RPC_URL is not set");
const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);

if (!SIGNER_PRIVATE_KEY) console.warn("PRIVATE_KEY is not set, writing to contract will fail"); // Предупреждение, если ключ не задан
const signer = SIGNER_PRIVATE_KEY ? new ethers.Wallet(SIGNER_PRIVATE_KEY, provider) : null;

if (!CONTRACT_ADDRESS) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set");
// Контракт для чтения (используем provider)
const readContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
// Контракт для записи (используем signer, если он есть)
const writeContract = signer ? readContract.connect(signer) as ethers.Contract : null;


// --- Генерация HTML для Frame ---
function generateFrameHtml(imageUrl: string, message: string, showInput: boolean, state: object, button1Text: string = "View Next", button2Text: string = "Add Wish"): string {
    const encodedState = encodeURIComponent(JSON.stringify(state));
    const postUrl = `${HOST_URL}/api/frame`; // Убедись, что URL правильный

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta property="og:title" content="Monad Wishlist">
            <meta property="og:image" content="${imageUrl}">
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${imageUrl}">
            ${showInput ? '<meta property="fc:frame:input:text" content="Enter your wish...">' : ''}
            <meta property="fc:frame:button:1" content="${button1Text}">
            <meta property="fc:frame:button:2" content="${button2Text}">
            <meta property="fc:frame:state" content="${encodedState}">
            <meta property="fc:frame:post_url" content="${postUrl}">
            <title>Monad Wishlist</title>
        </head>
        <body>${message} (Frame for Farcaster Clients)</body>
        </html>`;
}

// --- Основной обработчик POST запросов ---
export async function POST(req: NextRequest) {
    let fid: number | undefined;
    let buttonIndex: number | undefined;
    let inputText: string | undefined;
    let state = { index: -1 }; // Начальное состояние: -1 значит "еще не смотрели"
    let isValid = false;

    // 1. Валидация сообщения от Farcaster через Neynar
    try {
        const body: { trustedData?: { messageBytes?: string } } = await req.json();
        const messageBytes = body?.trustedData?.messageBytes;

        if (!messageBytes) {
            return new NextResponse(generateFrameHtml(`${HOST_URL}/error.png`, "Invalid request", false, state), { status: 400, headers: { 'Content-Type': 'text/html' } });
        }

        const validationResult = await neynarClient.validateMessage(messageBytes);
        if (validationResult.valid) {
            isValid = true;
            const frameMessage = validationResult.action; // Используем каст типа, если нужно
            fid = frameMessage.interactor.fid;
            buttonIndex = frameMessage.button?.index;
            inputText = frameMessage.input?.text;

             // Декодируем состояние из предыдущего шага
             if (frameMessage.state?.serialized) {
                try {
                    const decoded = JSON.parse(decodeURIComponent(frameMessage.state.serialized));
                    if (decoded.index !== undefined) {
                        state = decoded;
                    }
                } catch (e) { console.warn("Could not parse frame state:", e); }
             }
        }
    } catch (error) {
        console.error("Frame validation error:", error);
        return new NextResponse(generateFrameHtml(`${HOST_URL}/error.png`, "Validation Error", false, state), { status: 500, headers: { 'Content-Type': 'text/html' } });
    }

    if (!isValid || fid === undefined) {
         return new NextResponse(generateFrameHtml(`${HOST_URL}/error.png`, "Invalid message signature", false, state), { status: 401, headers: { 'Content-Type': 'text/html' } });
    }

    // 2. Логика обработки кнопок и ввода
    let imageUrl = `${HOST_URL}/default-wishlist.png`; // TODO: Создать картинку
    let message = "Your Monad Wishlist";
    let showInput = false;

    try {
        if (buttonIndex === 2 && inputText) {
            // --- ДОБАВИТЬ ЖЕЛАНИЕ (Кнопка 2 + Текст) ---
            if (!writeContract) {
                throw new Error("Signer not configured, cannot write to contract.");
            }
            message = `Adding "${inputText}"...`;
            // Отображаем временное сообщение перед отправкой транзакции
            const tempHtml = generateFrameHtml(imageUrl, message, false, state);
            // Отправляем транзакцию
             try {
                const tx = await writeContract.addItem(fid, inputText);
                console.log(`Adding item for FID ${fid}. Tx hash: ${tx.hash}`);
                await tx.wait(); // Ждем подтверждения
                console.log(`Item "${inputText}" added successfully for FID ${fid}.`);
                message = `"${inputText}" added!`;
                showInput = true; // Показываем поле для нового ввода
                state = { index: -1 }; // Сбрасываем просмотр
            } catch (txError: any) {
                 console.error("Transaction error adding item:", txError);
                 message = `Error adding: ${txError.message.slice(0,50)}...`; // Показать часть ошибки
                 showInput = true;
             }


        } else if (buttonIndex === 1) {
            // --- ПОСМОТРЕТЬ СЛЕДУЮЩЕЕ ЖЕЛАНИЕ (Кнопка 1) ---
            const countBigInt = await readContract.getWishlistCount(fid);
            const count = Number(countBigInt);

            if (count === 0) {
                message = "Your wishlist is empty. Add something!";
                showInput = true;
                state = { index: -1 };
            } else {
                const nextIndex = (state.index + 1) % count; // Зацикливаем просмотр
                const item = await readContract.getWishlistItem(fid, nextIndex);
                message = `Wish ${nextIndex + 1}/${count}: ${item}`;
                // TODO: Можно генерировать картинку с этим текстом
                // imageUrl = `${HOST_URL}/api/image?text=${encodeURIComponent(message)}`;
                showInput = false; // Скрываем поле ввода при просмотре
                state = { index: nextIndex }; // Обновляем состояние
            }
        } else {
            // --- НАЧАЛЬНОЕ СОСТОЯНИЕ или Неизвестное действие ---
             const countBigInt = await readContract.getWishlistCount(fid);
             const count = Number(countBigInt);
             if (count > 0) {
                message = `You have ${count} wishes. Click 'View Next' to see them or add a new one.`;
             } else {
                message = "Your wishlist is empty. Add your first wish!";
             }
            showInput = true; // Показываем поле ввода по умолчанию
            state = { index: -1 }; // Сброс состояния
        }
    } catch (error: any) {
        console.error("Contract interaction error:", error);
        message = `Error interacting with contract: ${error.message}`;
        showInput = true;
        state = { index: -1 }; // Сброс при ошибке
        // Можно добавить отдельную картинку для ошибки контракта
        // imageUrl = `${HOST_URL}/contract_error.png`;
    }

    // 3. Генерация и возврат HTML ответа
    const htmlResponse = generateFrameHtml(imageUrl, message, showInput, state);
    return new NextResponse(htmlResponse, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

// --- Обработчик GET запросов (для начального отображения) ---
export async function GET(req: NextRequest) {
    // Показываем начальное состояние Frame при GET запросе
    const initialImageUrl = `${HOST_URL}/default-wishlist.png`; // Ваша стартовая картинка
    const initialMessage = "Welcome to your Monad Wishlist Frame!";
    const initialHtml = generateFrameHtml(initialImageUrl, initialMessage, true, { index: -1 });
    return new NextResponse(initialHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
}