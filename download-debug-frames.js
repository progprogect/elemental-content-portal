#!/usr/bin/env node

/**
 * Скрипт для скачивания и проверки debug кадров
 * Использование: node download-debug-frames.js API_URL GENERATION_ID SCENE_ID
 */

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3000';
const GENERATION_ID = process.argv[3];
const SCENE_ID = process.argv[4] || 'scene_intro';

async function downloadDebugFrames() {
  if (!GENERATION_ID) {
    console.error('❌ Укажите GENERATION_ID');
    console.log('Использование: node download-debug-frames.js API_URL GENERATION_ID [SCENE_ID]');
    process.exit(1);
  }

  console.log('📸 Получение debug кадров');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`🆔 Generation ID: ${GENERATION_ID}`);
  console.log(`🎬 Scene ID: ${SCENE_ID}\n`);

  try {
    // Получаем статус генерации
    const statusResponse = await fetch(`${API_URL}/api/scene-generation/${GENERATION_ID}`);
    if (!statusResponse.ok) {
      throw new Error(`Failed to get status: ${statusResponse.status}`);
    }

    const status = await statusResponse.json();
    console.log(`✅ Генерация найдена: ${status.status}, Фаза: ${status.phase}\n`);

    // Находим нужную сцену
    const scene = (status.scenes || []).find((s) => s.sceneId === SCENE_ID);
    if (!scene) {
      console.log('❌ Сцена не найдена');
      console.log('Доступные сцены:');
      (status.scenes || []).forEach((s) => {
        console.log(`  - ${s.sceneId} (${s.kind})`);
      });
      process.exit(1);
    }

    console.log(`📋 Информация о сцене:`);
    console.log(`   ID: ${scene.sceneId}`);
    console.log(`   Тип: ${scene.kind}`);
    console.log(`   Статус: ${scene.status}`);
    if (scene.renderedAssetUrl) {
      console.log(`   Видео: ${scene.renderedAssetUrl}`);
    }
    console.log('');

    // Получаем debug кадры из sceneProject
    const sceneProject = scene.sceneProject;
    const debugFrames = sceneProject?.extra?.debugFrames || [];

    if (debugFrames.length === 0) {
      console.log('⚠️  Debug кадры не найдены в sceneProject');
      console.log('Попробуйте получить их через endpoint:');
      console.log(`   GET ${API_URL}/api/scene-generation/${GENERATION_ID}/scenes/${SCENE_ID}/debug-frames`);
      
      // Пробуем получить через endpoint
      try {
        const debugResponse = await fetch(
          `${API_URL}/api/scene-generation/${GENERATION_ID}/scenes/${SCENE_ID}/debug-frames`
        );
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          if (debugData.debugFrames && debugData.debugFrames.length > 0) {
            console.log(`\n✅ Найдено ${debugData.debugFrames.length} debug кадров через endpoint:\n`);
            debugData.debugFrames.forEach((frame, idx) => {
              console.log(`Кадр ${idx + 1}:`);
              console.log(`   Номер: ${frame.frame}`);
              console.log(`   URL: ${frame.url}`);
              console.log(`   Path: ${frame.path}`);
              console.log('');
            });
            return;
          }
        }
      } catch (error) {
        console.log(`   Ошибка: ${error.message}`);
      }
      
      process.exit(1);
    }

    console.log(`✅ Найдено ${debugFrames.length} debug кадров:\n`);

    // Выводим информацию о кадрах
    debugFrames.forEach((frame, idx) => {
      console.log(`📸 Кадр ${idx + 1}:`);
      console.log(`   Номер: ${frame.frame}`);
      console.log(`   URL: ${frame.url}`);
      console.log(`   Path: ${frame.path}`);
      console.log('');
    });

    // Проверяем доступность кадров
    console.log('🔍 Проверка доступности кадров...\n');
    for (const frame of debugFrames) {
      try {
        const response = await fetch(frame.url, { method: 'HEAD' });
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const contentLength = response.headers.get('content-length');
          console.log(`✅ Кадр ${frame.frame}: доступен`);
          console.log(`   Content-Type: ${contentType}`);
          console.log(`   Size: ${contentLength ? (parseInt(contentLength) / 1024).toFixed(2) + ' KB' : 'unknown'}`);
        } else {
          console.log(`❌ Кадр ${frame.frame}: недоступен (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ Кадр ${frame.frame}: ошибка при проверке - ${error.message}`);
      }
      console.log('');
    }

    console.log('💡 Для скачивания кадров используйте:');
    debugFrames.forEach((frame) => {
      console.log(`   curl -o frame-${frame.frame.toString().padStart(6, '0')}.png "${frame.url}"`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

downloadDebugFrames();

