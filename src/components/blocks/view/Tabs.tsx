import { TabsBlock } from "@/types/course";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextRenderer } from "@/components/richtext/RichTextRenderer";

export function TabsView({ block }: { block: TabsBlock }) {
  const first = block.items[0]?.id || "tab-1";
  return (
    <Tabs defaultValue={first}>
      <TabsList>
        {block.items.map((it) => (
          <TabsTrigger key={it.id} value={it.id}>{it.label}</TabsTrigger>
        ))}
      </TabsList>
      {block.items.map((it) => (
        <TabsContent key={it.id} value={it.id}>
          <RichTextRenderer html={it.content} className="prose prose-slate max-w-none dark:prose-invert" />
        </TabsContent>
      ))}
    </Tabs>
  );
}
