import { AppHeader } from "@/components/app-header";
import { PageHeaderProvider } from "@/components/page-header-context";

const Layout = ({ children }: { children: React.ReactNode; }) => {
  return (
    <PageHeaderProvider>
      <AppHeader />
      <main className="flex-1">{children}</main>
    </PageHeaderProvider>
  );
};

export default Layout;
