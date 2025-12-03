import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Content Type Configs
  const videoConfig = await prisma.contentTypeConfig.upsert({
    where: { contentType: 'video' },
    update: {},
    create: {
      contentType: 'video',
      generatorService: 'haygen',
      generatorType: 'video',
      promptTemplate: `Create a marketing video with the following requirements:

Description: {description}
Style: {style}
Duration: {duration}
Target Audience: {target_audience}

Additional context:
{additional_fields}`,
      requiredFields: ['description', 'style'],
    },
  });

  const imageConfig = await prisma.contentTypeConfig.upsert({
    where: { contentType: 'image' },
    update: {},
    create: {
      contentType: 'image',
      generatorService: 'nanobanana',
      generatorType: 'image',
      promptTemplate: `Generate an image with the following description:

{description}

Style: {style}
Aspect Ratio: {aspect_ratio}`,
      requiredFields: ['description'],
    },
  });

  const talkingHeadConfig = await prisma.contentTypeConfig.upsert({
    where: { contentType: 'talking_head' },
    update: {},
    create: {
      contentType: 'talking_head',
      generatorService: 'haygen',
      generatorType: 'image_to_video',
      promptTemplate: `Create a talking head video:

Script: {script}
Speaker Style: {speaker_style}
Background: {background}`,
      requiredFields: ['script'],
    },
  });

  console.log('Seeded content type configs:', {
    video: videoConfig,
    image: imageConfig,
    talkingHead: talkingHeadConfig,
  });

  // Task Lists (Projects)
  const socialMediaList = await prisma.taskList.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Соцсети',
      icon: '📱',
      color: '#3B82F6',
      orderIndex: 0,
    },
  });

  const learningList = await prisma.taskList.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Обучение',
      icon: '📚',
      color: '#10B981',
      orderIndex: 1,
    },
  });

  const noProjectList = await prisma.taskList.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Без проекта',
      icon: '📋',
      color: '#6B7280',
      orderIndex: 2,
    },
  });

  console.log('Seeded task lists:', {
    socialMedia: socialMediaList,
    learning: learningList,
    noProject: noProjectList,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

