"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type VariableTree = Record<string, Record<string, string>>;

interface VariablesHintProps {
  variables: VariableTree;
  onInsert: (handlebarsPath: string) => void;
}

export const VariablesHint = ({ variables, onInsert }: VariablesHintProps) => {
  const [open, setOpen] = useState(false);

  const hasAny = Object.keys(variables).length > 0;

  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Use variables from previous nodes.</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            Insert variable
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2 text-xs space-y-2">
          {Object.entries(variables).map(([root, fields]) => (
            <div key={root} className="space-y-1">
              <div className="font-medium text-foreground">{root}</div>
              <div className="space-y-1">
                {Object.entries(fields).map(([field, label]) => {
                  const path = `{{${root}.${field}}}`;
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => {
                        onInsert(path);
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-sm px-2 py-1 hover:bg-muted text-left"
                    >
                      <span className="truncate">{label}</span>
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {path}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
