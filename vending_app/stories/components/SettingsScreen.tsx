import { Lock, Phone, User } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";
// purchase history
export function SettingsScreen() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSave = () => {
    // Handle save logic here
    console.log("Saving profile:", { name, password });
  };

  return (
    <section className="px-6 py-8 bg-white">
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Profile Card */}
        <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0099ff] via-[#7c3aed] to-[#ec4899] flex items-center justify-center shadow-lg shadow-[#7c3aed]/20">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Your Profile
              </h3>
              <p className="text-sm text-gray-600">
                Manage your account details
              </p>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2 mb-4">
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-[#0099ff]" />
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#0099ff] focus:bg-white focus:shadow-lg focus:shadow-[#0099ff]/10"
            />
          </div>

          {/* Phone Input */}
          <div className="space-y-2 mb-4">
            <label className="text-sm text-gray-700 flex items-center gap-2">
              {/* <User className="w-4 h-4 text-[#0099ff]" /> */}
              <Phone className="w-4 h-4 text-[#0099ff]" />
              Phone
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#0099ff] focus:bg-white focus:shadow-lg focus:shadow-[#0099ff]/10"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2 mb-4">
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#7c3aed]" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#7c3aed] focus:bg-white focus:shadow-lg focus:shadow-[#7c3aed]/10"
            />
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-2 mb-6">
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#7c3aed]" />
              Confirm Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#7c3aed] focus:bg-white focus:shadow-lg focus:shadow-[#7c3aed]/10"
            />
          </div>
          {/* Save Button */}
          <div className="pt-2">
            <Button variant="primary" size="lg" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
