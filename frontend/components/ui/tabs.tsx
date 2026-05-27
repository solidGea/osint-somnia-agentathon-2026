import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be wrapped in <Tabs />.");
  }
  return context;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Tabs({ value, defaultValue, onValueChange, className, children, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      onValueChange?.(nextValue);
      if (value === undefined) {
        setInternalValue(nextValue);
      }
    },
    [onValueChange, value]
  );

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("flex flex-col", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabsContext();
  const isActive = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center rounded-md px-4 text-sm font-semibold transition",
        isActive
          ? "bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20"
          : "text-slate-400 hover:bg-cyan-500 hover:text-slate-950",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: selectedValue } = useTabsContext();
  if (selectedValue !== value) {
    return null;
  }

  return (
    <div className={cn("mt-4", className)} {...props}>
      {children}
    </div>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
