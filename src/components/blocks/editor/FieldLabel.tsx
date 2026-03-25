// src/components/blocks/editor/FieldLabel.tsx
export function FieldLabel({ children, required, htmlFor }: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
      {required && <span className="text-destructive ml-1" aria-hidden>*</span>}
    </label>
  );
}
