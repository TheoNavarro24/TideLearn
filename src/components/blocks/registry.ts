import { FC } from "react";
import { factories, Block, BlockType, HeadingBlock, TextBlock, CodeBlock, ImageBlock, QuizBlock, ListBlock, QuoteBlock, AccordionBlock, TabsBlock, DividerBlock, TocBlock, CalloutBlock, VideoBlock, AudioBlock, TrueFalseBlock, ShortAnswerBlock } from "@/types/course";
import { HeadingView } from "./view/Heading";
import { TextView } from "./view/Text";
import { CodeView } from "./view/Code";
import { ImageView } from "./view/Image";
import { QuizView } from "./view/Quiz";
import { ListView } from "./view/List";
import { QuoteView } from "./view/Quote";
import { AccordionView } from "./view/Accordion";
import { TabsView } from "./view/Tabs";
import { DividerView } from "./view/Divider";
import { CalloutView } from "./view/Callout";
import { VideoView } from "./view/Video";
import { AudioView } from "./view/Audio";
import { TrueFalseView } from "./view/TrueFalse";
import { ShortAnswerView } from "./view/ShortAnswer";
import { HeadingForm } from "./editor/HeadingForm";
import { TextForm } from "./editor/TextForm";
import { CodeForm } from "./editor/CodeForm";
import { ImageForm } from "./editor/ImageForm";
import { QuizForm } from "./editor/QuizForm";
import { ListForm } from "./editor/ListForm";
import { QuoteForm } from "./editor/QuoteForm";
import { AccordionForm } from "./editor/AccordionForm";
import { TabsForm } from "./editor/TabsForm";
import { DividerForm } from "./editor/DividerForm";
import { CalloutForm } from "./editor/CalloutForm";
import { VideoForm } from "./editor/VideoForm";
import { AudioForm } from "./editor/AudioForm";
import { TrueFalseForm } from "./editor/TrueFalseForm";
import { ShortAnswerForm } from "./editor/ShortAnswerForm";
import { TocForm } from "./editor/TocForm";
import { TocView } from "./view/Toc";
import { FileText, Type, Code, Image as ImageIcon, List as ListIcon, Quote, SquareStack, PanelsTopLeft, HelpCircle, Minus, Info, Video, AudioLines, CheckSquare, Edit3 } from "lucide-react";

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
    type: "code",
    label: "Code",
    icon: Code,
    create: factories.code,
    Editor: CodeForm as EditorRenderer<CodeBlock>,
    View: CodeView as ViewRenderer<CodeBlock>,
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
    type: "divider",
    label: "Divider",
    icon: Minus,
    create: factories.divider,
    Editor: DividerForm as EditorRenderer<DividerBlock>,
    View: DividerView as ViewRenderer<DividerBlock>,
    category: "Text",
  },
  {
    type: "toc",
    label: "Contents",
    icon: ListIcon,
    create: factories.toc,
    Editor: TocForm as EditorRenderer<TocBlock>,
    View: TocView as ViewRenderer<TocBlock>,
    category: "Text",
  },
  {
    type: "callout",
    label: "Callout",
    icon: Info,
    create: factories.callout,
    Editor: CalloutForm as EditorRenderer<CalloutBlock>,
    View: CalloutView as ViewRenderer<CalloutBlock>,
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
    type: "video",
    label: "Video",
    icon: Video,
    create: factories.video,
    Editor: VideoForm as EditorRenderer<VideoBlock>,
    View: VideoView as ViewRenderer<VideoBlock>,
    category: "Media",
  },
  {
    type: "audio",
    label: "Audio",
    icon: AudioLines,
    create: factories.audio,
    Editor: AudioForm as EditorRenderer<AudioBlock>,
    View: AudioView as ViewRenderer<AudioBlock>,
    category: "Media",
  },
  {
    type: "truefalse",
    label: "True / False",
    icon: CheckSquare,
    create: factories.truefalse,
    Editor: TrueFalseForm as EditorRenderer<TrueFalseBlock>,
    View: TrueFalseView as ViewRenderer<TrueFalseBlock>,
    category: "Knowledge",
  },
  {
    type: "shortanswer",
    label: "Short Answer",
    icon: Edit3,
    create: factories.shortanswer,
    Editor: ShortAnswerForm as EditorRenderer<ShortAnswerBlock>,
    View: ShortAnswerView as ViewRenderer<ShortAnswerBlock>,
    category: "Knowledge",
  },
  {
    type: "quiz",
    label: "Multiple Choice",
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
