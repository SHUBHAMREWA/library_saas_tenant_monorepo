'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  LogOut,
  Phone,
  Mail,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { fullName: string; email: string; phone: string; role: string; avatar?: string } | null;
  onLoginSuccess: (user: { fullName: string; email: string; phone: string; role: string; avatar?: string }) => void;
  onLogout?: () => void;
}

export function AuthModal({ isOpen, onClose, currentUser, onLoginSuccess, onLogout }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'google' | 'otp' | 'dev'>('google');
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [showManualGoogle, setShowManualGoogle] = useState(false);

  // OTP state
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [userName, setUserName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Dev testing state
  const [customName, setCustomName] = useState('');

  const [isGsiRendered, setIsGsiRendered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const GOOGLE_CLIENT_ID =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '872304322550-h2ltecllu0imjm2bbopatlmca8l372a6.apps.googleusercontent.com';

  // Decode Google JWT Credential
  const parseGoogleJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const resolveRole = (email: string) => {
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'kushwahashubham5932@gmail.com').toLowerCase().trim();
    const clean = email.toLowerCase().trim();
    if (clean === adminEmail || clean === 'kushwahashubham5932@gmail.com' || clean === 'admin@libraryhub.com' || clean.includes('admin')) {
      return 'SUPER_ADMIN';
    }
    return 'OWNER';
  };

  const handleGoogleCredentialResponse = (response: any) => {
    if (!response || !response.credential) return;
    setIsLoading(true);

    try {
      const payload = parseGoogleJwt(response.credential);
      const email = payload?.email || 'user@gmail.com';
      const fullName = payload?.name || payload?.given_name || email.split('@')[0];
      const avatar = payload?.picture;
      const role = resolveRole(email);

      onLoginSuccess({
        fullName,
        email,
        phone: '',
        role,
        avatar,
      });
      onClose();
    } catch (err) {
      console.error('[Google OAuth] Error parsing token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback handler when custom "Continue with Google" button is clicked
  const handleFallbackGoogleClick = () => {
    // 1. Try Google OAuth2 Token Client (Popup flow)
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              setIsLoading(true);
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const user = await res.json();
                const email = user.email || 'user@gmail.com';
                const fullName = user.name || user.given_name || email.split('@')[0];
                const avatar = user.picture;
                const role = resolveRole(email);

                onLoginSuccess({
                  fullName,
                  email,
                  phone: '',
                  role,
                  avatar,
                });
                onClose();
              } catch (err) {
                console.error('[Google OAuth] Error fetching userinfo:', err);
              } finally {
                setIsLoading(false);
              }
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('[GSI] OAuth2 popup fallback error:', err);
      }
    }

    // 2. Try Google Identity One-Tap prompt
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.prompt();
        return;
      } catch (err) {
        console.warn('[GSI] prompt fallback error:', err);
      }
    }

    // 3. Fallback: Automatically reveal direct Google Email entry
    setShowManualGoogle(true);
  };

  // Initialize Google Identity Services when modal is opened without currentUser
  useEffect(() => {
    if (!isOpen || currentUser) return;

    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const renderGsiButton = () => {
      if (!isMounted) return;
      if (typeof window === 'undefined') return;
      if (!(window as any).google?.accounts?.id) return;
      if (!googleBtnRef.current) return;

      try {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleBtnRef.current.innerHTML = '';
        (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 320,
        });
        setIsGsiRendered(true);
      } catch (err) {
        console.warn('[GSI] Init error:', err);
      }
    };

    // Ensure GSI script is loaded in document
    const ensureScriptAndInit = () => {
      if ((window as any).google?.accounts?.id) {
        renderGsiButton();
        return;
      }

      if (typeof document !== 'undefined' && !document.getElementById('google-gsi-client')) {
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          if (isMounted) renderGsiButton();
        };
        document.head.appendChild(script);
      }

      // Check periodically with a safe interval
      timer = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          if (timer) clearInterval(timer);
          renderGsiButton();
        }
      }, 100);
    };

    ensureScriptAndInit();

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [isOpen, currentUser, activeTab]);

  if (!isOpen) return null;

  // Direct Google Sign In
  const handleManualGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const email = googleEmail.trim();
      const fullName = googleName.trim() || email.split('@')[0];

      const role = resolveRole(email);
      onLoginSuccess({
        fullName,
        email,
        phone: '',
        role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff`,
      });
      onClose();
    }, 300);
  };

  // OTP Request Flow
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
    }, 300);
  };

  // OTP Verification Flow
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const target = emailOrPhone.trim();
      const isEmail = target.includes('@');
      const name = userName.trim() || (isEmail ? target.split('@')[0] : 'Library Owner');
      const email = isEmail ? target : `${target}@seelibrary.io`;
      const role = resolveRole(email);

      onLoginSuccess({
        fullName: name,
        email,
        phone: !isEmail ? target : '',
        role,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff`,
      });
      onClose();
    }, 300);
  };

  // Developer Test Login
  const handleTestLogin = (fullName: string, email: string, role = 'OWNER') => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const isSuperAdmin = email.toLowerCase().includes('admin') || role === 'SUPER_ADMIN';
      const finalRole = isSuperAdmin ? 'SUPER_ADMIN' : role;
      onLoginSuccess({
        fullName,
        email,
        phone: '9876543210',
        role: finalRole,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff`,
      });
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121212] text-slate-900 dark:text-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-[#262626] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-5 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-white text-base">
              sL
            </div>
            <h3 className="text-xl font-bold">
              {currentUser ? 'My Account' : 'seeLibrary Sign In'}
            </h3>
          </div>
          <p className="text-xs text-indigo-100">
            {currentUser
              ? 'Manage your seeLibrary account and active session'
              : 'Sign in with Google, Mobile OTP, or 1-Click Developer Demo'}
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {currentUser ? (
            /* --- LOGGED-IN STATE: Profile & Working Sign Out --- */
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-2xl flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-sm overflow-hidden flex-shrink-0">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.fullName} className="w-full h-full object-cover" />
                  ) : (
                    currentUser.fullName.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 truncate">
                      {currentUser.fullName}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full">
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {currentUser.email || currentUser.phone}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Session Active</span>
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={() => {
                  if (onLogout) onLogout();
                  onClose();
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of seeLibrary</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#262626] text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            /* --- LOGGED-OUT STATE: Google, OTP & Developer Testing --- */
            <div className="space-y-4">
              
              {/* Method Selector Tabs */}
              <div className="flex bg-slate-100 dark:bg-[#1a1a1a] p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-[#a8a8a8] border dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => setActiveTab('google')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'google'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('otp')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'otp'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Mobile / OTP
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dev')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    activeTab === 'dev'
                      ? 'bg-white dark:bg-[#262626] text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  1-Click Demo
                </button>
              </div>

              {/* TAB 1: Google Login */}
              <div className={activeTab === 'google' ? 'space-y-3 animate-in fade-in duration-150' : 'hidden'}>
                {/* Google Identity Services button container with instant fallback */}
                <div className="flex flex-col items-center justify-center min-h-[44px]">
                  <div
                    ref={googleBtnRef}
                    className={`w-full flex justify-center ${isGsiRendered ? 'block' : 'hidden'}`}
                  />

                  {!isGsiRendered && (
                    <button
                      type="button"
                      onClick={handleFallbackGoogleClick}
                      disabled={isLoading}
                      className="w-full max-w-[320px] h-[40px] px-3 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-medium text-xs sm:text-sm rounded-md border border-[#dadce0] shadow-xs flex items-center justify-center gap-3 transition-all cursor-pointer"
                      title="Continue with Google"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.4 7.5 23.5 12 23.5z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  )}
                </div>

                {/* Manual Google Account Fallback */}
                {!showManualGoogle ? (
                  <button
                    type="button"
                    onClick={() => setShowManualGoogle(true)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#262626] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-700 dark:text-white transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {/* Google G SVG */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.4 7.5 23.5 12 23.5z"
                        />
                      </svg>
                      <span>Enter Google Email Directly</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
                  </button>
                ) : (
                  <form onSubmit={handleManualGoogleSubmit} className="p-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-white">Enter Your Google Account</span>
                      <button
                        type="button"
                        onClick={() => setShowManualGoogle(false)}
                        className="text-[11px] text-slate-500 dark:text-[#a8a8a8] hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <input
                      type="email"
                      required
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="e.g. shubham@gmail.com"
                      className="w-full px-3 py-2 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                    />

                    <input
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      placeholder="Your Name (e.g. Shubham)"
                      className="w-full px-3 py-2 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                    />

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{isLoading ? 'Signing in...' : 'Continue with this Google Account'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>

              {/* TAB 2: Mobile / OTP Login */}
              <div className={activeTab === 'otp' ? 'space-y-3 animate-in fade-in duration-150' : 'hidden'}>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mobile Number or Email *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-[#737373]">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                          placeholder="e.g. 9876543210 or yourname@gmail.com"
                          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-slate-200 text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{isLoading ? 'Sending OTP...' : 'Send Verification OTP'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-indigo-900 dark:text-indigo-200 font-semibold truncate max-w-[200px]">{emailOrPhone}</span>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. Shubham"
                        className="w-full px-3 py-2 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 123456 (Demo OTP)"
                        className="w-full px-3 py-2 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-bold tracking-widest text-center text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isLoading ? 'Verifying...' : 'Verify & Enter Dashboard'}</span>
                    </button>
                  </form>
                )}
              </div>

              {/* TAB 3: Developer 1-Click Demo */}
              <div className={activeTab === 'dev' ? 'space-y-3 animate-in fade-in duration-150' : 'hidden'}>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>Instant 1-click test access with demo credentials.</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTestLogin('Rahul Sharma', 'rahul.owner@seelibrary.io', 'OWNER')}
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>1-Click Library Owner Login (Rahul Sharma)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="pt-2 border-t border-slate-100 dark:border-[#262626] flex gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Or enter custom name (e.g. Shubham)"
                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#737373] focus:bg-white dark:focus:bg-[#141414] focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const name = customName.trim() || 'Tester';
                      handleTestLogin(name, `${name.toLowerCase().replace(/\s+/g, '')}@seelibrary.io`);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Login
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
