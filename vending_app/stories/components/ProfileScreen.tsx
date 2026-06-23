import {
  BadgeCheck,
  Bell,
  ChevronRight,
  ExternalLink,
  Globe,
  Lock,
  Moon,
  Shield,
  User,
} from "lucide-react";
import { useState } from "react";
import { Text, View } from "react-native";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Button } from "./Button";

// purchase history
export function ProfileScreen() {
  const [activeTab, setActiveTab] = useState<"preferences" | "history">(
    "preferences"
  );
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleSave = () => {
    // Handle save logic here
    console.log("Saving profile:", { name, password });
  };
  const t = (key: string) => key; // Dummy translation function
  const user = {
    name: "John Doe",
    image: "https://example.com/avatar.jpg",
  };

  return (
    <section className="px-6 py-8 bg-white">
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-2 p-1 bg-gray-100 rounded-2xl">
        <button
          onClick={() => setActiveTab("preferences")}
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 active:scale-95 ${
            activeTab === "preferences"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600"
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 px-4 rounded-xl transition-all duration-200 active:scale-95 ${
            activeTab === "history"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600"
          }`}
        >
          History
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <View className="flex-row justify-around gap-3">
            <View className="items-center">
              <Text className="text-sm text-muted-foreground">
                {t("totalOrders")}
              </Text>
              <Text className="text-xl font-semibold">{"total"}</Text>
            </View>
            <View className="items-center">
              <Text className="text-sm text-muted-foreground">
                {t("totalSpent")}
              </Text>
              <Text className="text-xl font-semibold">
                {"totalSpent"} {t("sar")}
              </Text>
            </View>
          </View>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Profile */}
          <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-6 shadow-sm">
            <button className="w-full flex items-center justify-between transition-all duration-200 active:scale-98">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0099ff]/10 flex items-center justify-center">
                  {/* <Bell className="w-6 h-6 text-[#0099ff]" /> */}
                  <User className="w-6 h-6 text-[#0099ff]" />
                </div>
                <div className="text-left">
                  <h4 className="text-base font-semibold text-gray-900">
                    Profile
                  </h4>
                  <p className="text-sm text-gray-600">
                    Update your profile information
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Language */}
          <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-6 shadow-sm">
            <button className="w-full flex items-center justify-between transition-all duration-200 active:scale-98">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-[#7c3aed]" />
                </div>
                <div className="text-left">
                  <h4 className="text-base font-semibold text-gray-900">
                    Language
                  </h4>
                  <p className="text-sm text-gray-600">English (US)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Dark Mode */}
          {/* <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#ec4899]/10 flex items-center justify-center">
                  <Moon className="w-6 h-6 text-[#ec4899]" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    Dark Mode
                  </h4>
                  <p className="text-sm text-gray-600">Coming soon</p>
                </div>
              </div>
              <div className="w-10 h-6 bg-gray-200 rounded-full flex items-center px-1 transition-all duration-200 active:scale-95">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div> */}

          {/* Data & Privacy */}
          <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-6 shadow-sm">
            <button className="w-full flex items-center justify-between transition-all duration-200 active:scale-98">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0099ff]/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-[#0099ff]" />
                </div>
                <div className="text-left">
                  <h4 className="text-base font-semibold text-gray-900">
                    Data & Privacy
                  </h4>
                  <p className="text-sm text-gray-600">Control your data</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Terms of service */}
          <div className="rounded-3xl bg-gradient-to-br from-white to-gray-50 border border-gray-200 p-6 shadow-sm">
            <button className="w-full flex items-center justify-between transition-all duration-200 active:scale-98">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0099ff]/10 flex items-center justify-center">
                  {/* <Shield className="w-6 h-6 text-[#0099ff]" /> */}
                  <BadgeCheck className="w-6 h-6 text-[#0099ff]" />
                </div>
                <div className="text-left">
                  <h4 className="text-base font-semibold text-gray-900">
                    Terms of service
                  </h4>
                  <p className="text-sm text-gray-600">Control your data</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex w-full justify-center">
            <Button variant="destructive" size="lg" onClick={handleSave}>
              Delete my account
            </Button>
          </div>
          {/* App Version */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">Moaddi App v1.0.0</p>
            <p className="text-xs text-gray-400 mt-1">Build 2026.01.16</p>
          </div>
        </div>
      )}
    </section>
  );
}
