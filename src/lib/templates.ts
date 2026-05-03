import type { Lead } from "@prisma/client";

export type RenderedTemplate = {
  text: string;
  hasUnfilledVariables: boolean;
  unfilledList: string[];
};

export function renderTemplate(
  body: string,
  lead: Pick<
    Lead,
    "businessName" | "contactFirstName" | "neighborhood" | "city" | "listingUrl"
  >,
  senderFirstName: string
): RenderedTemplate {
  const fallbacks: Record<string, { value: string; isFallback: boolean }> = {
    businessName: { value: lead.businessName, isFallback: false },
    contactFirstName: lead.contactFirstName
      ? { value: lead.contactFirstName, isFallback: false }
      : { value: "there", isFallback: true },
    neighborhood: lead.neighborhood
      ? { value: lead.neighborhood, isFallback: false }
      : { value: "your neighborhood", isFallback: true },
    city: lead.city
      ? { value: lead.city, isFallback: false }
      : { value: "", isFallback: true },
    listingUrl: lead.listingUrl
      ? { value: lead.listingUrl, isFallback: false }
      : { value: "[your listing URL]", isFallback: true },
    senderFirstName: { value: senderFirstName, isFallback: false },
  };

  const unfilledList: string[] = [];
  const text = body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const entry = fallbacks[key];
    if (!entry) return `{{${key}}}`;
    if (entry.isFallback) unfilledList.push(key);
    return entry.value;
  });

  return {
    text,
    hasUnfilledVariables: unfilledList.length > 0,
    unfilledList,
  };
}
