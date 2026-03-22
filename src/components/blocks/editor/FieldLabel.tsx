// src/components/blocks/editor/FieldLabel.tsx
export function FieldLabel({ children, required, htmlFor }: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm text-muted-foreground">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}
