import { FC } from "react";
import { factories, Block, BlockType, HeadingBlock, TextBlock, ImageBlock, QuizBlock, ListBlock, QuoteBlock, AccordionBlock, TabsBlock } from "@/types/course";
import { HeadingView } from "./view/Heading";
import { TextView } from "./view/Text";
import { ImageView } from "./view/Image";
import { QuizView } from "./view/Quiz";
import { ListView } from "./view/List";
import { QuoteView } from "./view/Quote";
import { AccordionView } from "./view/Accordion";
import { TabsView } from "./view/Tabs";
import { HeadingForm } from "./editor/HeadingForm";
import { TextForm } from "./editor/TextForm";
import { ImageForm } from "./editor/ImageForm";
import { QuizForm } from "./editor/QuizForm";
import { ListForm } from "./editor/ListForm";
import { QuoteForm } from "./editor/QuoteForm";
import { AccordionForm } from "./editor/AccordionForm";
import { TabsForm } from "./editor/TabsForm";
import { FileText, Type, Image as ImageIcon, List as ListIcon, Quote, SquareStack, PanelsTopLeft, HelpCircle } from "lucide-react";

export type EditorRenderer<T extends Block> = FC<{ block: T; onChange: (b: T) => void }>;
export type ViewRenderer<T extends Block> = FC<{ block: T }>;

export type BlockSpec = {
  type: BlockType;
  label: string;
  icon: FC<any>;
  create: () => Block;
  Editor: EditorRenderer<any>;
  View: ViewRenderer<any>;
  category: "Text" | "Media" | "Interactive" | "Knowledge";
};

export const registry: BlockSpec[] = [
  {
    type: "heading",
    label: "Heading",
    icon: FileText,
    create: factories.heading,
    Editor: HeadingForm as EditorRenderer<HeadingBlock>,
    View: HeadingView as ViewRenderer<HeadingBlock>,
    category: "Text",
  },
  {
    type: "text",
    label: "Text",
    icon: Type,
    create: factories.text,
    Editor: TextForm as EditorRenderer<TextBlock>,
    View: TextView as ViewRenderer<TextBlock>,
    category: "Text",
  },
  {
    type: "image",
    label: "Image",
    icon: ImageIcon,
    create: factories.image,
    Editor: ImageForm as EditorRenderer<ImageBlock>,
    View: ImageView as ViewRenderer<ImageBlock>,
    category: "Media",
  },
  {
    type: "list",
    label: "List",
    icon: ListIcon,
    create: factories.list,
    Editor: ListForm as EditorRenderer<ListBlock>,
    View: ListView as ViewRenderer<ListBlock>,
    category: "Text",
  },
  {
    type: "quote",
    label: "Quote",
    icon: Quote,
    create: factories.quote,
    Editor: QuoteForm as EditorRenderer<QuoteBlock>,
    View: QuoteView as ViewRenderer<QuoteBlock>,
    category: "Text",
  },
  {
    type: "accordion",
    label: "Accordion",
    icon: SquareStack,
    create: factories.accordion,
    Editor: AccordionForm as EditorRenderer<AccordionBlock>,
    View: AccordionView as ViewRenderer<AccordionBlock>,
    category: "Interactive",
  },
  {
    type: "tabs",
    label: "Tabs",
    icon: PanelsTopLeft,
    create: factories.tabs,
    Editor: TabsForm as EditorRenderer<TabsBlock>,
    View: TabsView as ViewRenderer<TabsBlock>,
    category: "Interactive",
  },
  {
    type: "quiz",
    label: "Quiz (simple)",
    icon: HelpCircle,
    create: factories.quiz,
    Editor: QuizForm as EditorRenderer<QuizBlock>,
    View: QuizView as ViewRenderer<QuizBlock>,
    category: "Knowledge",
  },
];

export const createBlock = (type: BlockType) => {
  const spec = registry.find((r) => r.type === type);
  if (!spec) throw new Error(`Unknown block type: ${type}`);
  return spec.create();
};

export const getSpec = (type: BlockType) => registry.find((r) => r.type === type)!;
