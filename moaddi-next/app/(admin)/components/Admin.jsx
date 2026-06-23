"use client";
import dynamic from "next/dynamic";

const Admin = dynamic(() => import("@/(admin)/components/AdminApp"), {
  ssr: false,
});

export default Admin;
