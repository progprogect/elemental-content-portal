#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки качества кадров
 * Создает простую генерацию и проверяет качество кадров
 */

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3000';

async function testFramesQuality() {
  console.log('🎬 Тестирование качества кадров');
  console.log(`📍 API URL: ${API_URL}\n`);

  try {
    // Создаем простую генерацию
    console.log('📝 Создание тестовой генерации...');
    const generateResponse = await fetch(`${API_URL}/api/scene-generation/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Создай простой баннер с текстом "Тест качества кадров" на белом фоне',
        reviewScenario: false,
        reviewScenes: false,
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      throw new Error(`Failed to create generation: ${generateResponse.status} ${errorText}`);
    }

    const generateData = await generateResponse.json();
    const generationId = generateData.id;
    console.log(`✅ Генерация создана: ${generationId}\n`);

    // Мониторим прогресс
    console.log('⏳ Ожидание завершения Phase 3 (рендер кадров)...\n');
    let lastPhase = '';
    let debugFrameUrls = [];

    const checkInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`${API_URL}/api/scene-generation/${generationId}`);
        
        if (!statusResponse.ok) {
          throw new Error(`Failed to get status: ${statusResponse.status}`);
        }

        const status = await statusResponse.json();
        
        if (status.phase !== lastPhase) {
          console.log(`📊 Фаза: ${status.phase}, Статус: ${status.status}, Прогресс: ${status.progress}%`);
          lastPhase = status.phase;
        }

        // Когда Phase 3 завершена, получаем информацию о сценах
        if (status.phase === 'phase3' && status.status === 'completed' && status.scenes) {
          console.log(`\n✅ Phase 3 завершена! Найдено сцен: ${status.scenes.length}\n`);
          
          // Получаем детальную информацию о сценах
          status.scenes.forEach((scene, idx) => {
            console.log(`Сцена ${idx + 1}: ${scene.sceneId}`);
            console.log(`   Статус: ${scene.status}`);
            console.log(`   Тип: ${scene.kind || 'N/A'}`);
            if (scene.renderedAssetUrl) {
              console.log(`   ✅ Видео URL: ${scene.renderedAssetUrl}`);
            }
          });

          // Debug кадры должны быть в storage по пути:
          // scene-generation/debug-frames/{sceneId}/frame-*.png
          console.log('\n🔍 Получение debug кадров...\n');
          
          // Для каждой сцены проверяем наличие debug кадров
          for (const scene of status.scenes) {
            if (scene.kind === 'banner') {
              console.log(`\n📸 Проверка debug кадров для сцены: ${scene.sceneId}`);
              
              try {
                // Получаем информацию о debug кадрах через API
                const debugFramesResponse = await fetch(
                  `${API_URL}/api/scene-generation/${generationId}/scenes/${scene.sceneId}/debug-frames`
                );
                
                if (debugFramesResponse.ok) {
                  const debugInfo = await debugFramesResponse.json();
                  console.log(`   Путь в storage: ${debugInfo.debugFramesPath}`);
                  console.log(`   Примечание: ${debugInfo.note}`);
                }
                
                // Попробуем построить примерные URL для Cloudinary
                // Формат Cloudinary: https://res.cloudinary.com/{cloud_name}/image/upload/{path}
                const basePath = `scene-generation/debug-frames/${scene.sceneId}`;
                console.log(`\n   📋 Примерные пути debug кадров:`);
                console.log(`      - ${basePath}/frame-000000.png (первый кадр)`);
                console.log(`      - ${basePath}/frame-XXXXXX.png (средний кадр)`);
                console.log(`      - ${basePath}/frame-XXXXXX.png (последний кадр)`);
                console.log(`\n   ⚠️  Точные URL доступны в логах сервера при генерации`);
                console.log(`   Ищите в логах: "Debug frame saved to storage"`);
              } catch (error) {
                console.log(`   ⚠️  Не удалось получить информацию о debug кадрах: ${error.message}`);
              }
            }
          }
          
          console.log(`\n💡 Для получения точных URL debug кадров:`);
          console.log(`   1. Проверьте логи сервера Scene Generation Service`);
          console.log(`   2. Ищите записи с "Debug frame saved to storage"`);
          console.log(`   3. В логах будут указаны точные URL кадров\n`);

          clearInterval(checkInterval);
          
          // Показываем финальный результат
          if (status.status === 'completed') {
            console.log('✅ Генерация завершена успешно!');
            if (status.resultUrl) {
              console.log(`🎬 Финальное видео: ${status.resultUrl}`);
            }
          }
          
          process.exit(0);
        }

        // Проверяем ошибки
        if (status.status === 'failed') {
          clearInterval(checkInterval);
          console.log(`\n❌ Генерация провалилась: ${status.error || 'Неизвестная ошибка'}`);
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Ошибка при проверке статуса:', error.message);
        clearInterval(checkInterval);
        process.exit(1);
      }
    }, 2000);

    // Таймаут через 5 минут
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('\n⏱️  Таймаут: генерация не завершилась за 5 минут');
      process.exit(1);
    }, 300000);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testFramesQuality();

