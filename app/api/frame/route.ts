// Файл: app/api/frame/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
// ИСПРАВЛЕНИЕ 1: Убрали /server из пути импорта.
// ИСПРАВЛЕНИЕ 3 (проактивное): Убрали isApiErrorResponse, так как он может быть недоступен из корня.
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

// --- Конфигурация (Читаем из .env.local) ---
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || "";
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "";
// Приватный ключ для отправки транзакций (запись в контракт)
const SIGNER_PRIVATE_KEY = process.env.PRIVATE_KEY || "";
// Адрес нашего контракта Wishlist (ИЗ .env.local)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
// URL нашего приложения (ИЗ .env.local - используем NEXT_PUBLIC_URL)
const APP_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// --- ВАЖНО: ABI (Application Binary Interface) нашего контракта Wishlist ---
// Вставь сюда свой реальный ABI, скопированный из Remix.
// Формат: плоский массив объектов JSON.
const contractABI = [
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
]; // <-- Конец ABI

// --- Инициализация ---
if (!NEYNAR_API_KEY) throw new Error("NEYNAR_API_KEY is not set in .env.local");
// Используем стандартный конструктор
const neynarClient = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });

if (!MONAD_RPC_URL) throw new Error("MONAD_RPC_URL is not set in .env.local");
const provider = new ethers.JsonRpcProvider(MONAD_RPC_URL);

// Создаем signer только если есть приватный ключ
const signer = SIGNER_PRIVATE_KEY ? new ethers.Wallet(SIGNER_PRIVATE_KEY, provider) : null;
if (!signer) {
    console.warn("PRIVATE_KEY is not set in .env.local. Wishlist additions will fail.");
}

if (!CONTRACT_ADDRESS) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set in .env.local");
if (!contractABI || contractABI.length === 0) {
     console.error("contractABI is empty! Make sure to paste the ABI from Remix.");
     throw new Error("contractABI is not set correctly in route.ts");
}

// Контракт для чтения (используем provider)
const readContract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
// Контракт для записи (используем signer, если он есть)
const writeContract = signer ? readContract.connect(signer) as ethers.Contract : null;


// --- Генерация HTML для Frame ---
function generateFrameHtml(imageUrl: string, message: string, showInput: boolean, state: object, button1Text: string = "View Next", button2Text: string = "Add Wish"): string {
    const encodedState = encodeURIComponent(JSON.stringify(state));
    const postUrl = `${APP_URL}/api/frame`; // Используем APP_URL

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta property="og:title" content="Monad Wishlist">
            <meta property="og:image" content="${imageUrl}">
            <meta property="fc:frame" content="vNext">
            <meta property="fc:frame:image" content="${imageUrl}">
            ${showInput ? `<meta property="fc:frame:input:text" content="Enter your wish...">` : ''}
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
    let state = { index: -1 };
    let isValid = false;
    let action: any = null;

    const errorImageUrl = `${APP_URL}/error.png`;

    // 1. Валидация сообщения от Farcaster через Neynar
    // ИСПРАВЛЕНИЕ 2: Заменили catch(error) на catch(error: any)
    try {
        const body: { trustedData?: { messageBytes?: string } } = await req.json();
        const messageBytes = body?.trustedData?.messageBytes;

        if (!messageBytes) {
             console.error("Invalid request: messageBytes missing");
            return new NextResponse(generateFrameHtml(errorImageUrl, "Invalid request data", false, state), { status: 400, headers: { 'Content-Type': 'text/html' } });
        }

        // Используем validateFrameAction
        const validationResponse = await neynarClient.validateFrameAction({ messageBytesInHex: messageBytes });
        action = validationResponse.action;

        if (validationResponse.valid && action) {
            isValid = true;
            fid = action.interactor.fid;
            buttonIndex = action.tapped_button?.index;
            inputText = action.input?.text;

             if (action.state?.serialized) {
                try {
                    const decoded = JSON.parse(decodeURIComponent(action.state.serialized));
                    if (decoded.index !== undefined) {
                        state = decoded;
                    }
                } catch (e) { console.warn("Could not parse frame state:", e); }
             } else {
                 state = { index: -1 };
             }
        } else {
             console.error("Frame validation failed:", validationResponse);
        }

    // ИСПРАВЛЕНИЕ 2: Заменили catch(error) на catch(error: any)
    // ИСПРАВЛЕНИЕ 3: Упростили обработку, убрав isApiErrorResponse
    } catch (error: any) {
         console.error("Error validating frame:", error?.response?.data || error?.message || error);
         return new NextResponse(generateFrameHtml(errorImageUrl, "Validation Error", false, state), { status: 500, headers: { 'Content-Type': 'text/html' } });
    }

    if (!isValid || fid === undefined) {
         console.error("Invalid FID or signature after validation");
         return new NextResponse(generateFrameHtml(errorImageUrl, "Invalid message signature or FID", false, state), { status: 401, headers: { 'Content-Type': 'text/html' } });
    }

    // 2. Логика обработки кнопок и ввода
    let imageUrl = `${APP_URL}/default-wishlist.png`;
    let message = "Your Monad Wishlist";
    let showInput = false;

    // ИСПРАВЛЕНИЕ 2: Заменили catch(error) на catch(error: any)
    try {
        if (buttonIndex === 2 && inputText) {
            // --- ДОБАВИТЬ ЖЕЛАНИЕ (Кнопка 2 + Текст) ---
            if (!writeContract) {
                 console.error("Cannot add item: Signer (PRIVATE_KEY) is not configured.");
                message = "Error: Writing not configured by the server.";
                showInput = true;
            } else {
                 // ИСПРАВЛЕНИЕ 2: Заменили catch(error) на catch(error: any) внутри блока добавления
                 try {
                    console.log(`Attempting to add item "${inputText}" for FID ${fid}...`);
                    const tx = await writeContract.addItem(fid, inputText);
                    console.log(`Add item TX sent for FID ${fid}. Hash: ${tx.hash}. Waiting for confirmation...`);
                    const receipt = await tx.wait(1);
                    console.log(`Item "${inputText}" added successfully for FID ${fid}. Tx Status: ${receipt?.status === 1 ? 'Success' : 'Failed'}`);
                    if (receipt?.status !== 1) {
                        throw new Error("Transaction failed on-chain.");
                    }
                    message = `"${inputText}" added! Add another?`;
                    showInput = true;
                    state = { index: -1 };
                } catch (txError: any) { // <-- Убедились что здесь any
                     console.error(`Transaction error adding item for FID ${fid}:`, txError);
                     const reason = txError.reason || txError.data?.message || txError.message || "Unknown transaction error";
                     message = `Error adding: ${reason.slice(0,100)}...`;
                     showInput = true;
                 }
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
                const nextIndex = (state.index + 1) % count;
                const item = await readContract.getWishlistItem(fid, nextIndex);
                message = `Wish ${nextIndex + 1}/${count}: ${item}`;
                showInput = false;
                state = { index: nextIndex };
            }
        } else {
            // --- НАЧАЛЬНОЕ СОСТОЯНИЕ или Неизвестное действие ---
             const countBigInt = await readContract.getWishlistCount(fid);
             const count = Number(countBigInt);
             if (count > 0) {
                message = `You have ${count} wishes. View or add more!`;
             } else {
                message = "Your Monad wishlist is empty. Add your first wish!";
             }
            showInput = true;
            state = { index: -1 };
        }
    } catch (error: any) { // <-- Убедились что здесь any
        console.error(`Contract interaction error for FID ${fid}:`, error);
        message = `Error interacting with contract: ${error.message.slice(0,100)}...`;
        showInput = true;
        state = { index: -1 };
        imageUrl = errorImageUrl;
    }

    // 3. Генерация и возврат HTML ответа
    const htmlResponse = generateFrameHtml(imageUrl, message, showInput, state);
    return new NextResponse(htmlResponse, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

// --- Обработчик GET запросов (для начального отображения Frame) ---
export async function GET(req: NextRequest) {
    // Показываем начальное состояние Frame при GET запросе к /api/frame
    const initialImageUrl = `${APP_URL}/default-wishlist.png`;
    const initialMessage = "Welcome to your Monad Wishlist Frame!";
    const initialHtml = generateFrameHtml(initialImageUrl, initialMessage, true, { index: -1 });
    return new NextResponse(initialHtml, { status: 200, headers: { 'Content-Type': 'text/html' } });
}