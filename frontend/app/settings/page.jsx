"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Lock, Code2, Trash2, Check,
  Eye, EyeOff, Plus, RefreshCw, AlertCircle
} from "lucide-react";
import Sidebar from "../dashboard/components/Sidebar";

const API = "/api";

// ── Shared fetch helper ───────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ── UI Components ─────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border backdrop-blur-xl overflow-hidden shadow-lg transition-all ${
        accent ? "border-red-500/10 bg-red-950/5" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className={`flex items-center gap-3 sm:gap-4 px-5 sm:px-8 py-4 sm:py-6 border-b ${
        accent ? "border-red-500/10 bg-red-500/[0.02]" : "border-white/5 bg-white/[0.01]"
      }`}>
        <div className={`p-2.5 rounded-xl shadow-inner shrink-0 ${
          accent ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[#D85D3F]/10 text-[#D85D3F] border border-[#D85D3F]/20"
        }`}>
          <Icon size={20} />
        </div>
        <div>
          <h2 className={`text-base sm:text-lg font-serif tracking-wide ${accent ? "text-red-400" : "text-white"}`}>
            {title}
          </h2>
          {subtitle && <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 leading-snug">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5 sm:p-8 space-y-6">{children}</div>
    </motion.div>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      <label className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold tracking-widest ml-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && show ? "text" : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          // Using text-base on mobile prevents iOS Safari from auto-zooming when tapping inputs!
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D85D3F]/50 focus:border-[#D85D3F] transition-all placeholder:text-gray-600"
        />
        {isPassword && (
          <button 
            onClick={() => setShow(v => !v)} 
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-2"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}

function SaveButton({ onClick, loading, saved, label, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || saved}
      className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 ${
        danger
          ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300"
          : saved 
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-[#D85D3F] text-white hover:bg-[#eb6545] shadow-[0_0_15px_rgba(216,93,63,0.3)] hover:shadow-[0_0_25px_rgba(216,93,63,0.5)] border border-[#D85D3F]/50"
      }`}
    >
      {loading ? <RefreshCw size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
      {saved ? "Saved Successfully" : label}
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [handles, setHandles] = useState([]);
  const [newHandle, setNewHandle] = useState("");
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  
  const [loading, setLoading] = useState({ page: true, handle: false, profile: false, pass: false });
  const [savedState, setSavedState] = useState({ profile: false, pass: false });
  const [toast, setToast] = useState(null);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    Promise.all([
      apiFetch("/auth/me"),
      apiFetch("/codeforces/handles"),
    ])
      .then(([user, handlesData]) => {
        setEmail(user.email ?? "");
        setHandles([
          ...(handlesData.active ? [handlesData.active] : []),
          ...(handlesData.others ?? []),
        ]);
      })
      .catch(() => showToast("Failed to load user data", true))
      .finally(() => setLoading(prev => ({ ...prev, page: false })));
  }, []);

  const handleSaveProfile = async () => {
    setLoading(p => ({ ...p, profile: true }));
    try {
      await apiFetch("/user/profile", { method: "PATCH", body: JSON.stringify({ email }) });
      setSavedState(p => ({ ...p, profile: true }));
      setTimeout(() => setSavedState(p => ({ ...p, profile: false })), 2000);
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setLoading(p => ({ ...p, profile: false }));
    }
  };

  const handleChangePassword = async () => {
    setLoading(p => ({ ...p, pass: true }));
    try {
      await apiFetch("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }),
      });
      setPasswords({ current: "", new: "", confirm: "" });
      setSavedState(p => ({ ...p, pass: true }));
      setTimeout(() => setSavedState(p => ({ ...p, pass: false })), 2000);
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setLoading(p => ({ ...p, pass: false }));
    }
  };

  const handleAddHandle = async () => {
    if (!newHandle.trim()) return;
    setLoading(p => ({ ...p, handle: true }));
    try {
      await apiFetch("/codeforces/link-handle", { method: "POST", body: JSON.stringify({ handle: newHandle.trim() }) });
      await apiFetch("/codeforces/sync", { method: "POST" });
      const data = await apiFetch("/codeforces/handles");
      setHandles([...(data.active ? [data.active] : []), ...(data.others ?? [])]);
      setNewHandle("");
      showToast("Handle added and synced successfully!");
    } catch (e) {
      showToast(e.message, true);
    } finally {
      setLoading(p => ({ ...p, handle: false }));
    }
  };

  const handleSetActive = async (id) => {
    try {
      await apiFetch(`/codeforces/handle/${id}/activate`, { method: "PATCH" });
      const data = await apiFetch("/codeforces/handles");
      setHandles([...(data.active ? [data.active] : []), ...(data.others ?? [])]);
    } catch (e) {
      showToast("Failed to activate handle", true);
    }
  };

  const handleRemoveHandle = async (id) => {
    try {
      await apiFetch(`/codeforces/handle/${id}`, { method: "DELETE" });
      const data = await apiFetch("/codeforces/handles");
      setHandles([...(data.active ? [data.active] : []), ...(data.others ?? [])]);
    } catch (e) {
      showToast("Failed to remove handle", true);
    }
  };

  const handleDeleteAccount = async () => {
    if(!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await apiFetch("/user/account", { method: "DELETE", body: JSON.stringify({ confirm: "DELETE" }) });
      window.location.href = "/auth";
    } catch (e) {
      showToast(e.message, true);
    }
  };

  if (loading.page) return (
    <div className="flex h-screen bg-[#111111] text-white">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#D85D3F]" />
      </main>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#111111] text-gray-300 font-sans overflow-hidden selection:bg-[#D85D3F]/30 relative">
      
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D85D3F]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <Sidebar className="z-20 relative" />

      {/* THE FIX: Added pb-32 so the mobile floating dock doesn't hide the bottom content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-10 pt-8 sm:pt-12 pb-32 md:pb-12 overflow-y-auto relative z-10 custom-scrollbar">
        
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 sm:px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border w-[90%] sm:w-auto justify-center ${
                toast.isError ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}
            >
              {toast.isError ? <AlertCircle size={16} className="shrink-0" /> : <Check size={16} className="shrink-0" />}
              <span className="text-xs sm:text-sm font-medium truncate">{toast.msg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
          
          <div className="mb-6 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-serif text-white tracking-tight mb-2">Settings</h1>
            <p className="text-xs sm:text-sm text-gray-500">Manage your account preferences and connected integrations.</p>
          </div>

          <Section icon={User} title="Profile Settings" subtitle="Update your basic account information.">
            <div className="w-full sm:max-w-md space-y-5">
              <Field label="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
              <div className="pt-2">
                <SaveButton onClick={handleSaveProfile} loading={loading.profile} saved={savedState.profile} label="Save Changes" />
              </div>
            </div>
          </Section>

          <Section icon={Lock} title="Security" subtitle="Ensure your account is using a long, random password.">
            <div className="w-full sm:max-w-md space-y-5">
              <Field label="Current Password" type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
              <Field label="New Password" type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} />
              <div className="pt-2">
                <SaveButton onClick={handleChangePassword} loading={loading.pass} saved={savedState.pass} label="Update Password" />
              </div>
            </div>
          </Section>

          <Section icon={Code2} title="Codeforces Handles" subtitle="Link multiple handles to track your performance.">
            <div className="space-y-3 mb-6 sm:mb-8">
              {handles.length === 0 ? (
                <div className="text-center py-6 bg-white/[0.02] border border-white/5 rounded-2xl text-sm text-gray-500 italic">
                  No handles connected yet.
                </div>
              ) : (
                handles.map(h => (
                  <div key={h.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white text-base sm:text-lg">{h.handle}</span>
                      {h.isActive && (
                        <span className="px-2.5 py-1 rounded-md bg-[#D85D3F]/10 text-[#D85D3F] border border-[#D85D3F]/20 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold">
                          Active Sync
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {!h.isActive && (
                        <button onClick={() => handleSetActive(h.id)} className="flex-1 sm:flex-none text-xs font-medium text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-2 sm:py-1.5 rounded-lg border border-white/10 text-center">
                          Set Active
                        </button>
                      )}
                      <button onClick={() => handleRemoveHandle(h.id)} className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10 shrink-0" title="Remove Handle">
                        <Trash2 size={18} className="sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-6 border-t border-white/5">
              <label className="text-[10px] sm:text-xs text-gray-500 uppercase font-semibold tracking-widest ml-1 mb-2 block">
                Connect New Handle
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  value={newHandle} 
                  onChange={e => setNewHandle(e.target.value)} 
                  placeholder="e.g. tourist"
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 sm:py-3 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D85D3F]/50 focus:border-[#D85D3F] transition-all placeholder:text-gray-600" 
                />
                <button 
                  onClick={handleAddHandle}
                  disabled={loading.handle || !newHandle.trim()}
                  className="w-full sm:w-auto px-6 py-3.5 sm:py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/10 font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading.handle ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16}/>}
                  Add Handle
                </button>
              </div>
            </div>
          </Section>

          <Section icon={AlertCircle} title="Danger Zone" subtitle="Permanently delete your account and wipe all data." accent>
            <div className="pt-1">
              <SaveButton onClick={handleDeleteAccount} label="Delete Account" danger />
            </div>
          </Section>

        </div>
      </main>
    </div>
  );
}