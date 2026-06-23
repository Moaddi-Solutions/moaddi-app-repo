import { Mail, MessageSquare, User } from "lucide-react";
import { Button } from "./Button";

export function ContactScreen() {
  return (
    <section className="px-6 py-16 bg-gray-50">
      {/* Section Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Get in Touch</h2>
        <p className="text-gray-600">Connect with the future of shopping</p>
      </div>

      {/* Contact Form */}
      <div className="max-w-md mx-auto">
        <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-sm">
          <form className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-[#2cb4cc]" />
                Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#2cb4cc] focus:bg-white focus:shadow-lg focus:shadow-[#2cb4cc]/10"
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#7287e2]" />
                Email
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-[#7287e2] focus:bg-white focus:shadow-lg focus:shadow-[#7287e2]/10"
              />
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#e0bd5f]" />
                Message
              </label>
              <textarea
                placeholder="Tell us about your project..."
                rows={4}
                className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 outline-none resize-none transition-all duration-200 focus:border-[#e0bd5f] focus:bg-white focus:shadow-lg focus:shadow-[#e0bd5f]/10"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button variant="primary" size="lg">
                Send Message
              </Button>
            </div>
          </form>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <span className="text-xs text-gray-500">or reach us directly</span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-[#2cb4cc]" />
            <a
              href="mailto:support@moaddi-app.com"
              className="transition-colors"
            >
              support@moaddi-app.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
