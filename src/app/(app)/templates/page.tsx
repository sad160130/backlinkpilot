import { getAllTemplates } from "@/app/actions/templates";
import { TemplatesClient } from "@/components/TemplatesClient";

export const revalidate = 0;

export default async function TemplatesPage() {
  const templates = await getAllTemplates();
  return <TemplatesClient templates={templates} />;
}
