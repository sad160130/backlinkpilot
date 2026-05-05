import { getAllTemplates } from "@/app/actions/templates";
import { TemplatesClient } from "@/components/TemplatesClient";

export default async function TemplatesPage() {
  const templates = await getAllTemplates();
  return <TemplatesClient templates={templates} />;
}
