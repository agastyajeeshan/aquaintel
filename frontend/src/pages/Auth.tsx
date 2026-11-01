import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Waves,
  Lock,
  User,
} from "lucide-react";

export const Auth: React.FC = () => {
  const { setCurrentUser, setActivePage } = useApp();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [username, setUsername] = useState<string>("admin");
  const [password, setPassword] = useState<string>("admin123");
  const [msg, setMsg] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      id: 1,
      username: username || "admin",
      email: `${username}@aquaintel.io`,
      full_name: username === "admin" ? "Dr. K. Srinivas" : username.toUpperCase(),
      role: "ADMIN",
    });
    setActivePage("dashboard");
  };

  const handleQuickDemoLogin = (role: string, name: string, user: string) => {
    setCurrentUser({
      id: 1,
      username: user,
      email: `${user}@aquaintel.io`,
      full_name: name,
      role: role as any,
    });
    setActivePage("dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F6F8F6] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#247653] to-[#168B91] flex items-center justify-center text-white mx-auto shadow-soft">
          <Waves className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[#172820] tracking-tight">
          AQUA<span className="text-[#247653]">INTEL</span>
        </h2>
        <p className="mt-1 text-xs text-[#68776F]">
          Sense Smart. Predict Early. Farm Better.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="soft-card-elevated p-6 sm:p-8 space-y-5">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs font-semibold text-[#172820]">
              <div className="pb-2 border-b border-[#E3EAE5]">
                <h3 className="text-base font-bold text-[#172820]">
                  Sign in to Commercial Portal
                </h3>
                <p className="text-xs text-[#68776F] font-normal">Enter authorized operator credentials</p>
              </div>

              <div>
                <label className="block mb-1 text-[#68776F]">Username / Operator ID</label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-2.5 text-[#68776F]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="soft-input w-full pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[#68776F]">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-2.5 text-[#68776F]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="soft-input w-full pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-[#247653] hover:underline font-semibold"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-[#68776F] hover:text-[#172820]"
                >
                  Create Account
                </button>
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2.5 px-4 text-xs font-semibold mt-2"
              >
                Sign In to AquaIntel
              </button>
            </form>
          )}

          {mode === "register" && (
            <div className="space-y-4 text-xs font-semibold text-[#172820]">
              <div className="pb-2 border-b border-[#E3EAE5]">
                <h3 className="text-base font-bold text-[#172820]">
                  Register Farm Operator
                </h3>
                <p className="text-xs text-[#68776F] font-normal">Provision a new field account</p>
              </div>

              <div>
                <label className="block mb-1 text-[#68776F]">Full Name</label>
                <input type="text" placeholder="e.g. Rajesh Reddy" className="soft-input w-full text-xs" />
              </div>
              <div>
                <label className="block mb-1 text-[#68776F]">Email</label>
                <input type="email" placeholder="rajesh@aquaintel.io" className="soft-input w-full text-xs" />
              </div>
              <div>
                <label className="block mb-1 text-[#68776F]">Password</label>
                <input type="password" placeholder="••••••••" className="soft-input w-full text-xs" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setMsg("Registration recorded. Logging in as new operator.");
                  handleQuickDemoLogin("OPERATOR", "Rajesh Reddy", "rajesh");
                }}
                className="btn-primary w-full py-2.5 px-4 text-xs font-semibold"
              >
                Register & Enter Portal
              </button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-[#247653] font-semibold"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="space-y-4 text-xs font-semibold text-[#172820]">
              <div className="pb-2 border-b border-[#E3EAE5]">
                <h3 className="text-base font-bold text-[#172820]">
                  Password Recovery
                </h3>
                <p className="text-[#68776F] font-normal text-xs mt-0.5">
                  Enter your verified technician or manager email to receive an SMS/Email OTP reset token.
                </p>
              </div>
              <div>
                <label className="block mb-1 text-[#68776F]">Email Address</label>
                <input type="email" placeholder="admin@aquaintel.io" className="soft-input w-full text-xs" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMsg("OTP verification link dispatched to registered device.");
                  setTimeout(() => setMode("login"), 2000);
                }}
                className="btn-primary w-full py-2.5 px-4 text-xs font-semibold"
              >
                Send Reset Code
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-[#247653] font-semibold"
              >
                Cancel & Return
              </button>
            </div>
          )}

          {msg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold">
              {msg}
            </div>
          )}

          {/* Quick Demo Access Bar */}
          <div className="pt-4 border-t border-[#E3EAE5] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#68776F] block text-center">
              Instant 1-Click Demo Profile Switcher
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("ADMIN", "Dr. K. Srinivas", "admin")}
                className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5] text-[#172820] hover:bg-[#EFF4F0] text-[11px] font-semibold text-left transition-all"
              >
                <span className="text-[#247653] font-bold block text-[10px]">ADMIN</span>
                Dr. K. Srinivas
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("FARM_MANAGER", "V. Naresh", "manager")}
                className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5] text-[#172820] hover:bg-[#EFF4F0] text-[11px] font-semibold text-left transition-all"
              >
                <span className="text-[#168B91] font-bold block text-[10px]">MANAGER</span>
                V. Naresh
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("OPERATOR", "B. Venkat", "operator")}
                className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5] text-[#172820] hover:bg-[#EFF4F0] text-[11px] font-semibold text-left transition-all"
              >
                <span className="text-[#3478B8] font-bold block text-[10px]">OPERATOR</span>
                B. Venkat
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("VIEWER", "Rajiv Menon", "viewer")}
                className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E3EAE5] text-[#172820] hover:bg-[#EFF4F0] text-[11px] font-semibold text-left transition-all"
              >
                <span className="text-[#68776F] font-bold block text-[10px]">VIEWER</span>
                Rajiv Menon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
