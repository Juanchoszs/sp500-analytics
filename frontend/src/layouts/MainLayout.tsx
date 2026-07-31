import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-[#020617]">
      <Sidebar />
      <main className="flex-1 ml-[280px]">
        <Outlet />
      </main>
    </div>
  );
}