import { AccordionBlock } from "@/types/course";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function AccordionView({ block }: { block: AccordionBlock }) {
  return (
    <Accordion type="single" collapsible>
      {block.items.map((it) => (
        <AccordionItem key={it.id} value={it.id}>
          <AccordionTrigger>{it.title}</AccordionTrigger>
          <AccordionContent>
            <div className="prose prose-slate max-w-none dark:prose-invert">
              <p>{it.content}</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
