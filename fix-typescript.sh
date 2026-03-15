#!/bin/bash
echo "Next.js TypeScript cache temizleniyor..."
rm -rf .next
echo "Node_modules yeniden başlatılıyor..."
npm run dev
