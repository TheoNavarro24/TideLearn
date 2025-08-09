import { AccordionBlock } from "@/types/course";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RichTextRenderer } from "@/components/richtext/RichTextRenderer";

export function AccordionView({ block }: { block: AccordionBlock }) {
  return (
    <Accordion type="single" collapsible>
      {block.items.map((it) => (
        <AccordionItem key={it.id} value={it.id}>
          <AccordionTrigger>{it.title}</AccordionTrigger>
          <AccordionContent>
            <RichTextRenderer html={it.content} className="prose prose-slate max-w-none dark:prose-invert" />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
