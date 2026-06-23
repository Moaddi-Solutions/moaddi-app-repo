import { Facebook, Instagram } from "lucide-react";
import logo from "../assets/logo.jpeg";

export function Footer() {
  return (
    <footer className="px-6 py-12 border-t border-gray-200 bg-white">
      {/* Social Icons */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <a
          href="#"
          className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 transition-all duration-200 active:scale-95"
          aria-label="Facebook"
        >
          <Facebook className="w-5 h-5" />
        </a>

        <a
          href="#"
          className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 transition-all duration-200 active:scale-95"
          aria-label="Instagram"
        >
          <Instagram className="w-5 h-5" />
        </a>

        <a
          href="#"
          className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-600 transition-all duration-200 active:scale-95"
          aria-label="TikTok"
        >
          {/* TikTok Icon */}
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        </a>
      </div>

      {/* Branding */}
      <div className="text-center ">
        <div className="flex items-center justify-center">
          <img className="w-20" src={logo} />

          {/* <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2cb4cc] via-[#7287e2] to-[#e0bd5f] p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <div className="w-3 h-3 bg-gradient-to-br from-[#2cb4cc] to-[#7287e2] rounded-full" />
            </div>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-[#2cb4cc] to-[#7287e2] bg-clip-text text-transparent">
            Moaddi
          </span> */}
        </div>

        <div className="pt-4">
          <p className="text-xs text-gray-400">
            © 2026 Moaddi. All rights reserved.
          </p>
        </div>
      </div>

      {/* Tech Badge */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <div className="w-2 h-2 rounded-full bg-[#2cb4cc]/50 animate-pulse" />
        <span>Powered by Fortis Team</span>
      </div>
    </footer>
  );
}
