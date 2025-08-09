import { TabsBlock } from "@/types/course";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <p>{it.content}</p>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
