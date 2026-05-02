import { PrismaClient, PipelineStage } from "@prisma/client";

const prisma = new PrismaClient();

const templates: Array<{
  name: string;
  stage: PipelineStage;
  isFirstMessage: boolean;
  order: number;
}> = [
  { name: "1st Template",         stage: PipelineStage.REACH_OUT_1,          isFirstMessage: true,  order: 1 },
  { name: "1st Template - Email", stage: PipelineStage.REACH_OUT_1,          isFirstMessage: true,  order: 2 },
  { name: "Prompt 1A",            stage: PipelineStage.REACH_OUT_1,          isFirstMessage: false, order: 3 },
  { name: "Prompt 1B",            stage: PipelineStage.REACH_OUT_1,          isFirstMessage: false, order: 4 },
  { name: "Prompt 1C",            stage: PipelineStage.REACH_OUT_1,          isFirstMessage: false, order: 5 },
  { name: "2nd Template",         stage: PipelineStage.UPGRADE_PREVIEW_SENT, isFirstMessage: true,  order: 1 },
  { name: "Prompt 2A",            stage: PipelineStage.UPGRADE_PREVIEW_SENT, isFirstMessage: false, order: 2 },
  { name: "Prompt 2B",            stage: PipelineStage.UPGRADE_PREVIEW_SENT, isFirstMessage: false, order: 3 },
  { name: "Prompt 2C",            stage: PipelineStage.UPGRADE_PREVIEW_SENT, isFirstMessage: false, order: 4 },
  { name: "3rd Template",         stage: PipelineStage.UPGRADE_LIVE,         isFirstMessage: true,  order: 1 },
  { name: "Prompt 3A",            stage: PipelineStage.UPGRADE_LIVE,         isFirstMessage: false, order: 2 },
  { name: "Prompt 3B",            stage: PipelineStage.UPGRADE_LIVE,         isFirstMessage: false, order: 3 },
  { name: "Prompt 3C",            stage: PipelineStage.UPGRADE_LIVE,         isFirstMessage: false, order: 4 },
];

async function main() {
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  for (const t of templates) {
    const body = `TODO: paste real body for ${t.name} from PRD section 1.5`;
    await prisma.template.upsert({
      where: { name: t.name },
      update: {
        stage: t.stage,
        isFirstMessage: t.isFirstMessage,
        order: t.order,
        body,
      },
      create: {
        name: t.name,
        stage: t.stage,
        isFirstMessage: t.isFirstMessage,
        order: t.order,
        body,
      },
    });
  }

  console.log(`Seeded Settings + ${templates.length} templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
