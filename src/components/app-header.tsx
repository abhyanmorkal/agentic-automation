import { PageHeaderSlot } from "@/components/page-header-context";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const AppHeader = () => {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4 bg-background w-full">
      <SidebarTrigger />
      <div className="flex-1 min-w-0 flex items-center">
        <PageHeaderSlot />
      </div>
    </header>
  );
};
