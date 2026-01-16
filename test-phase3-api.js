#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки Phase 3 через API
 * Использование: node test-phase3-api.js [API_URL] [GENERATION_ID]
 * 
 * Если GENERATION_ID не указан, будет создана новая генерация
 */

const API_URL = process.argv[2] || process.env.API_URL || 'http://localhost:3000';
const GENERATION_ID = process.argv[3];

async function testPhase3() {
  console.log('🚀 Тестирование Phase 3 через API');
  console.log(`📍 API URL: ${API_URL}\n`);

  try {
    let generationId = GENERATION_ID;

    // Если ID не указан, создаем новую генерацию
    if (!generationId) {
      console.log('📝 Создание новой генерации...');
      const generateResponse = await fetch(`${API_URL}/api/scene-generation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Создай короткий баннер с текстом "Тест Phase 3"',
          reviewScenario: false,
          reviewScenes: false,
        }),
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        throw new Error(`Failed to create generation: ${generateResponse.status} ${errorText}`);
      }

      const generateData = await generateResponse.json();
      generationId = generateData.id;
      console.log(`✅ Генерация создана: ${generationId}`);
      console.log(`   Статус: ${generateData.status}, Фаза: ${generateData.phase}, Прогресс: ${generateData.progress}%\n`);
    } else {
      console.log(`📋 Используем существующую генерацию: ${generationId}\n`);
    }

    // Мониторинг статуса генерации
    console.log('⏳ Мониторинг прогресса генерации...\n');
    let lastPhase = '';
    let lastProgress = -1;

    const checkInterval = setInterval(async () => {
      try {
        const statusResponse = await fetch(`${API_URL}/api/scene-generation/${generationId}`);
        
        if (!statusResponse.ok) {
          throw new Error(`Failed to get status: ${statusResponse.status}`);
        }

        const status = await statusResponse.json();
        
        // Логируем изменения фазы или прогресса
        if (status.phase !== lastPhase || status.progress !== lastProgress) {
          console.log(`📊 [${new Date().toLocaleTimeString()}] Фаза: ${status.phase}, Статус: ${status.status}, Прогресс: ${status.progress}%`);
          
          if (status.phase === 'phase3' && status.scenes) {
            console.log(`   🎬 Сцены (${status.scenes.length}):`);
            status.scenes.forEach((scene, idx) => {
              console.log(`      ${idx + 1}. ${scene.sceneId} - ${scene.status} ${scene.progress ? `(${scene.progress}%)` : ''}`);
              if (scene.renderedAssetPath) {
                console.log(`         Path: ${scene.renderedAssetPath}`);
              }
              if (scene.renderedAssetUrl) {
                console.log(`         URL: ${scene.renderedAssetUrl}`);
              }
              if (scene.error) {
                console.log(`         ❌ Ошибка: ${scene.error}`);
              }
            });
          }
          
          lastPhase = status.phase;
          lastProgress = status.progress;
        }

        // Проверяем завершение
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(checkInterval);
          console.log('\n✅ Генерация завершена!');
          console.log(`   Финальный статус: ${status.status}`);
          console.log(`   Финальная фаза: ${status.phase}`);
          console.log(`   Финальный прогресс: ${status.progress}%`);
          
          if (status.status === 'completed') {
            console.log('\n📋 Детальная информация о сценах:');
            if (status.scenes && status.scenes.length > 0) {
              status.scenes.forEach((scene, idx) => {
                console.log(`\n   Сцена ${idx + 1}: ${scene.sceneId}`);
                console.log(`      Статус: ${scene.status}`);
                console.log(`      Порядок: ${scene.orderIndex}`);
                console.log(`      Тип: ${scene.kind || 'N/A'}`);
                if (scene.renderedAssetPath) {
                  console.log(`      ✅ Path: ${scene.renderedAssetPath}`);
                } else {
                  console.log(`      ❌ Path: отсутствует`);
                }
                if (scene.renderedAssetUrl) {
                  console.log(`      ✅ URL: ${scene.renderedAssetUrl}`);
                } else {
                  console.log(`      ❌ URL: отсутствует`);
                }
                if (scene.duration) {
                  console.log(`      Длительность: ${scene.duration}с`);
                }
                if (scene.error) {
                  console.log(`      ❌ Ошибка: ${scene.error}`);
                }
              });
              
              // Проверка данных для Phase 4
              const completedScenes = status.scenes.filter(s => s.status === 'completed' && s.renderedAssetPath);
              console.log(`\n✅ Успешно отрендерено сцен: ${completedScenes.length} из ${status.scenes.length}`);
              
              if (completedScenes.length > 0) {
                console.log('\n📦 Проверка готовности для Phase 4:');
                const allHavePath = completedScenes.every(s => !!s.renderedAssetPath);
                const allHaveUrl = completedScenes.every(s => !!s.renderedAssetUrl);
                const allHaveDuration = completedScenes.every(s => s.duration > 0);
                
                console.log(`   ✅ Все сцены имеют path: ${allHavePath ? 'ДА' : 'НЕТ'}`);
                console.log(`   ✅ Все сцены имеют URL: ${allHaveUrl ? 'ДА' : 'НЕТ'}`);
                console.log(`   ✅ Все сцены имеют длительность: ${allHaveDuration ? 'ДА' : 'НЕТ'}`);
                
                if (allHavePath && allHaveUrl && allHaveDuration) {
                  console.log('\n🎉 Все сцены готовы для Phase 4 (финальная композиция)!');
                } else {
                  console.log('\n⚠️  Некоторые сцены не готовы для Phase 4');
                }
              }
            } else {
              console.log('   ❌ Сцены не найдены');
            }
            
            if (status.resultUrl) {
              console.log(`\n🎬 Финальное видео: ${status.resultUrl}`);
            }
          } else if (status.status === 'failed') {
            console.log(`\n❌ Генерация провалилась: ${status.error || 'Неизвестная ошибка'}`);
          }
          
          process.exit(0);
        }
      } catch (error) {
        console.error('❌ Ошибка при проверке статуса:', error.message);
        clearInterval(checkInterval);
        process.exit(1);
      }
    }, 2000); // Проверяем каждые 2 секунды

    // Таймаут через 10 минут
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('\n⏱️  Таймаут: генерация не завершилась за 10 минут');
      process.exit(1);
    }, 600000);

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testPhase3();

