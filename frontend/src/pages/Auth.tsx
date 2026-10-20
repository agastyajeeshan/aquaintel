import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Waves,
  Lock,
  User,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

export const Auth: React.FC = () => {
  const { setCurrentUser, setActivePage } = useApp();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [username, setUsername] = useState<string>("admin");
  const [password, setPassword] = useState<string>("admin123");
  const [email, setEmail] = useState<string>("");
  const [msg, setMsg] = useState<string>("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo quick login
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white mx-auto shadow-md">
          <Waves className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          AQUA<span className="text-teal-600">INTEL</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Smart Prawn Farm Automation & AI Disease Risk Management
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-card rounded-2xl border border-slate-200 sm:px-10 space-y-5">
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs font-bold text-slate-700">
              <h3 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
                Sign in to Commercial Portal
              </h3>

              <div>
                <label className="block mb-1">Username / ID</label>
                <div className="relative">
                  <User className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 p-2.5 rounded-xl border border-slate-300 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 p-2.5 rounded-xl border border-slate-300 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-teal-700 hover:underline font-bold"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-slate-500 hover:text-slate-800"
                >
                  Create Account
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-sm transition-colors mt-2"
              >
                Sign In
              </button>
            </form>
          )}

          {mode === "register" && (
            <div className="space-y-4 text-xs font-bold text-slate-700">
              <h3 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
                Register Farm Operator
              </h3>

              <div>
                <label className="block mb-1">Full Name</label>
                <input type="text" placeholder="e.g. Rajesh Reddy" className="w-full p-2.5 rounded-xl border border-slate-300 font-medium" />
              </div>
              <div>
                <label className="block mb-1">Email</label>
                <input type="email" placeholder="rajesh@aquaintel.io" className="w-full p-2.5 rounded-xl border border-slate-300 font-medium" />
              </div>
              <div>
                <label className="block mb-1">Password</label>
                <input type="password" placeholder="••••••••" className="w-full p-2.5 rounded-xl border border-slate-300 font-medium" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setMsg("Registration recorded. Logging in as new operator.");
                  handleQuickDemoLogin("OPERATOR", "Rajesh Reddy", "rajesh");
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-sm"
              >
                Register & Enter Portal
              </button>

              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-teal-700 font-bold"
              >
                Back to Sign In
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div className="space-y-4 text-xs font-bold text-slate-700">
              <h3 className="text-base font-black text-slate-900 pb-2 border-b border-slate-100">
                Password Recovery
              </h3>
              <p className="text-slate-500 font-normal">
                Enter your verified technician or manager email to receive an SMS/Email OTP reset token.
              </p>
              <div>
                <label className="block mb-1">Email Address</label>
                <input type="email" placeholder="admin@aquaintel.io" className="w-full p-2.5 rounded-xl border border-slate-300 font-medium" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMsg("OTP verification link dispatched to phone.");
                  setTimeout(() => setMode("login"), 2000);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-sm"
              >
                Send Reset Code
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full text-center text-teal-700 font-bold"
              >
                Cancel & Return
              </button>
            </div>
          )}

          {msg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {msg}
            </div>
          )}

          {/* Quick Demo Access Bar */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Instant 1-Click Demo Profile Switcher
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin("ADMIN", "Dr. K. Srinivas", "admin")}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 text-[11px] font-bold text-left"
              >
                <span className="text-teal-700 block">ADMIN</span>
                Dr. K. Srinivas
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("FARM_MANAGER", "V. Naresh", "manager")}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 text-[11px] font-bold text-left"
              >
                <span className="text-teal-700 block">MANAGER</span>
                V. Naresh
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("OPERATOR", "B. Venkat", "operator")}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 text-[11px] font-bold text-left"
              >
                <span className="text-teal-700 block">OPERATOR</span>
                B. Venkat
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin("VIEWER", "Rajiv Menon", "viewer")}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 hover:bg-slate-100 text-[11px] font-bold text-left"
              >
                <span className="text-teal-700 block">VIEWER</span>
                Rajiv Menon
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
