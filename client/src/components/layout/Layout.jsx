import Navbar from "./Navbar";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
       <Navbar />
       <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
         {children}
       </main>
    </div>
  );
};

export default Layout;