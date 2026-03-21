"use client";

import { useState } from "react";
import { LayoutGrid, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const API_BASE = "/api";

  const [activeTab, setActiveTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError("");
    setFormData({ email: "", password: "" });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const endpoint = activeTab === "signin" ? "/auth/login" : "/auth/register";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Authentication failed");
      }

      const bootstrapRes = await fetch(`${API_BASE}/user/bootstrap`, {
        credentials: "include",
      });

      if (!bootstrapRes.ok) {
        throw new Error("Failed to load user state");
      }

      const bootstrap = await bootstrapRes.json();

      if (bootstrap.connected) {
        router.push("/dashboard");
      } else {
        router.push("/connect-codeforces");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Injecting keyframes here so you don't need to touch tailwind.config.js */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes customFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-custom-fade {
          animation: customFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        
        {/* Ambient Background Glows for Glass Effect */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#D85D3F]/10 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#D85D3F]/10 blur-[100px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Header Section */}
        <div className="flex flex-col items-center mb-8 space-y-3 z-10 animate-custom-fade">
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-lg">
            <LayoutGrid className="w-8 h-8 text-[#D85D3F]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {activeTab === "signin" ? "Welcome back" : "Get started"}
            </h1>
            <p className="text-gray-400 text-sm mt-2 max-w-[280px]">
              {activeTab === "signin"
                ? "Sign in to your dashboard to continue tracking."
                : "Create a new account to start tracking."}
            </p>
          </div>
        </div>

        {/* Return Button */}
        <button
          onClick={() => router.push("/")}
          className="mb-6 text-sm text-gray-400 hover:text-white transition-colors z-10"
        >
          ← Return to Home
        </button>

        {/* Main Glass Card */}
        <div className="w-full max-w-[420px] bg-[#1A1A1A]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 animate-custom-fade" style={{ animationDelay: '0.1s', opacity: 0 }}>
          
          {/* Tabs */}
          <div className="flex bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
            {["signin", "create"].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === tab
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                {tab === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-semibold text-gray-400 ml-1">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D85D3F]/50 focus:border-[#D85D3F] transition-all placeholder:text-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-semibold text-gray-400 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#D85D3F]/50 focus:border-[#D85D3F] transition-all placeholder:text-gray-600 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative w-full overflow-hidden bg-[#D85D3F] hover:bg-[#eb6545] text-white py-3.5 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center shadow-[0_0_20px_rgba(216,93,63,0.3)] hover:shadow-[0_0_30px_rgba(216,93,63,0.5)] mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <span className="relative z-10">
                  {activeTab === "signin" ? "Sign In" : "Create Account"}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}