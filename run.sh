#!/bin/bash

echo "========================================="
echo "    Запуск проекта Bookstore (Читалка)   "
echo "========================================="

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Ошибка: Node.js не установлен."
    exit 1
fi

echo "📦 Установка зависимостей (если нужно)..."
npm install

echo "🗄️ Проверка базы данных..."
if [ ! -f "prisma/dev.db" ]; then
    echo "Создание базы данных..."
    npx prisma db push
fi

echo "🚀 Запуск приложения..."
npm run dev
