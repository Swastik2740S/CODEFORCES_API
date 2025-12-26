"use client";

import { useState } from "react";
import { LayoutGrid, Eye, EyeOff, BarChart3, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_URL;


  const [activeTab, setActiveTab] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

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
      const endpoint =
        activeTab === "signin" ? "/auth/login" : "/auth/register";

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

      // 🔍 BACKEND-DRIVEN ROUTING
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
    <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="flex flex-col items-center mb-8 space-y-2 animate-fadeIn">
        <div className="bg-[#2C2C2C] p-2 rounded-lg border border-[#333]">
          <LayoutGrid className="w-6 h-6 text-[#D85D3F]" />
        </div>
        <h1 className="text-3xl font-medium">
          {activeTab === "signin" ? "Welcome back" : "Get started"}
        </h1>
        <p className="text-gray-400 text-sm">
          {activeTab === "signin"
            ? "Sign in to your dashboard to continue tracking."
            : "Create a new account to start tracking."}
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-[400px] bg-[#1A1A1A] border border-[#262626] rounded-2xl p-6 shadow-xl">
        {/* Tabs */}
        <div className="flex bg-[#111111] p-1 rounded-lg mb-6 border border-[#262626]">
          {["signin", "create"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabSwitch(tab)}
              className={`flex-1 py-1.5 text-sm rounded-md transition-all ${activeTab === tab
                ? "bg-[#262626] text-white shadow"
                : "text-gray-500 hover:text-gray-300"
                }`}
            >
              {tab === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm animate-shake">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs text-gray-400">Email address</label>
            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
              className="w-full bg-[#262626] border border-[#333] rounded-lg px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#D85D3F]"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-gray-400">Password</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full bg-[#262626] border border-[#333] rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-1 focus:ring-[#D85D3F]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#D85D3F] hover:bg-[#c05238] py-2.5 rounded-lg flex justify-center items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : activeTab === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>


        
      </div>
    </div>
  );
}
