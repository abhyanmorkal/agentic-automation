"use client";

import { BracesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { UpstreamReference } from "../lib/upstream-references";

interface Props {
  references: UpstreamReference[];
  onInsert: (template: string) => void;
}

export const ReferencePicker = ({ references, onInsert }: Props) => {
  if (references.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="gap-1.5">
          <BracesIcon className="size-3.5" />
          Insert reference
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 p-2" align="start">
        {references.map((reference) => (
          <div key={reference.id} className="space-y-1">
            <p className="px-2 text-xs font-medium text-foreground">
              {reference.label}
            </p>
            <div className="space-y-1">
              {reference.references.map((item) => (
                <button
                  key={`${reference.id}-${item.template}`}
                  type="button"
                  onClick={() => onInsert(item.template)}
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-left hover:bg-muted"
                >
                  <span className="truncate text-xs">{item.label}</span>
                  <code className="ml-2 truncate text-[10px] text-muted-foreground">
                    {item.template}
                  </code>
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};
