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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

