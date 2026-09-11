'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  Share2,
  QrCode,
  X,
  Copy,
  Check,
  Smartphone,
  Monitor,
  ExternalLink,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import QRCode from 'qrcode';

interface FooterShareBarProps {
  className?: string;
  shareUrl?: string;
  shareTitle?: string;
  shareDescription?: string;
}

export const FooterShareBar: React.FC<FooterShareBarProps> = ({
  className = '',
  shareUrl,
  shareTitle = 'seeLibrary - Study Library & Reading Room Management SaaS',
  shareDescription = 'Join and manage your study center and reading room with seeLibrary!',
}) => {
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [activeInstallTab, setActiveInstallTab] = useState<'desktop' | 'mobile' | 'qr'>('desktop');

  useEffect(() => {
    setMounted(true);
    const url = shareUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    setTargetUrl(url);

    // 1. Check if running as standalone PWA
    const checkStandalone = () => {
      const isDisplayStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isDisplayStandalone);
    };

    checkStandalone();

    // 2. Check if global prompt already caught in layout.tsx
    if (typeof window !== 'undefined' && (window as any).__pwaPrompt) {
      setDeferredPrompt((window as any).__pwaPrompt);
    }

    // 3. Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsStandalone(true);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // 4. Listen for PWA prompt events
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__pwaPrompt = e;
    };

    const handleCustomPromptReady = (e: any) => {
      setDeferredPrompt(e.detail || (window as any).__pwaPrompt);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      (window as any).__pwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handleCustomPromptReady);
    window.addEventListener('pwa-installed', handleAppInstalled);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Pre-generate QR Code
    QRCode.toDataURL(url || window.location.origin, {
      width: 320,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then(setQrDataUrl)
      .catch((err) => console.warn('QR pre-generation error:', err));

    // Determine initial tab based on device
    if (typeof navigator !== 'undefined') {
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      setActiveInstallTab(isMobile ? 'mobile' : 'desktop');
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handleCustomPromptReady);
      window.removeEventListener('pwa-installed', handleAppInstalled);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [shareUrl]);

  const handleDownloadApp = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__pwaPrompt : null);

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        (window as any).__pwaPrompt = null;
        return;
      } catch (err) {
        console.warn('Native prompt failed, falling back to guide:', err);
      }
    }

    // If native prompt is not directly available, show guide modal
    setIsInstallModalOpen(true);
  };

  const handleCopyLink = () => {
    const url = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = async () => {
    const url = targetUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareDescription,
          url: url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const shareViaWhatsApp = () => {
    const url = encodeURIComponent(targetUrl || window.location.href);
    const text = encodeURIComponent(`${shareDescription}\n\n`);
    window.open(`https://api.whatsapp.com/send?text=${text}${url}`, '_blank', 'noopener,noreferrer');
  };

  const shareViaTwitter = () => {
    const url = encodeURIComponent(targetUrl || window.location.href);
    const text = encodeURIComponent(shareTitle);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  if (!mounted) return null;

  return (
    <>
      <div className={`flex flex-wrap items-center justify-center sm:justify-start gap-2.5 ${className}`}>
        {/* WhatsApp Icon Button */}
        <button
          type="button"
          onClick={shareViaWhatsApp}
          className="w-10 h-10 rounded-full bg-slate-900/90 dark:bg-[#18122B] hover:bg-[#25D366] dark:hover:bg-[#25D366] text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 border border-indigo-500/20 shadow-sm hover:scale-110 active:scale-95 cursor-pointer group"
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        </button>

        {/* X / Twitter Icon Button */}
        <button
          type="button"
          onClick={shareViaTwitter}
          className="w-10 h-10 rounded-full bg-slate-900/90 dark:bg-[#18122B] hover:bg-black text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 border border-indigo-500/20 shadow-sm hover:scale-110 active:scale-95 cursor-pointer group"
          title="Share on X (Twitter)"
          aria-label="Share on X (Twitter)"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>

        {/* QR Code Share Button */}
        <button
          type="button"
          onClick={() => setIsQrModalOpen(true)}
          className="w-10 h-10 rounded-full bg-slate-900/90 dark:bg-[#18122B] hover:bg-indigo-600 text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 border border-indigo-500/20 shadow-sm hover:scale-110 active:scale-95 cursor-pointer group"
          title="Share via QR Code"
          aria-label="Share via QR Code"
        >
          <QrCode className="w-5 h-5 transition-transform group-hover:scale-105" />
        </button>

        {/* General Share / Copy Link Button */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-10 h-10 rounded-full bg-slate-900/90 dark:bg-[#18122B] hover:bg-purple-600 text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 border border-indigo-500/20 shadow-sm hover:scale-110 active:scale-95 cursor-pointer group"
          title="Share Application"
          aria-label="Share Application"
        >
          <Share2 className="w-4.5 h-4.5 transition-transform group-hover:scale-105" />
        </button>

        {/* Download App PWA Button (Hidden if already downloaded / standalone) */}
        {!isStandalone && (
          <button
            type="button"
            onClick={handleDownloadApp}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download App</span>
          </button>
        )}
      </div>

      {/* Comprehensive Install App Guidance Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center text-center">
            <button
              type="button"
              onClick={() => setIsInstallModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* App Icon */}
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-md p-1 mb-3 flex items-center justify-center">
              <img
                src="/icons/icon-192x192.png"
                alt="seeLibrary Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Install seeLibrary App
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 mb-4">
              Get the full desktop & mobile standalone experience with offline access and fast launch.
            </p>

            {/* Platform Selector Tabs */}
            <div className="flex w-full bg-slate-100 dark:bg-[#1c1c1e] p-1 rounded-2xl mb-4 border border-slate-200/80 dark:border-[#262626]">
              <button
                type="button"
                onClick={() => setActiveInstallTab('desktop')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeInstallTab === 'desktop'
                    ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInstallTab('mobile')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeInstallTab === 'mobile'
                    ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInstallTab('qr')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeInstallTab === 'qr'
                    ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
            </div>

            {/* Desktop Instructions */}
            {activeInstallTab === 'desktop' && (
              <div className="w-full text-left space-y-3 bg-slate-50 dark:bg-neutral-900/60 p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 text-xs text-slate-700 dark:text-neutral-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    In Chrome or Edge, look at the <strong>right side of your address bar</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    Click the <strong>Install App icon (⊕ or 💻)</strong> or click Menu (⋮) → <strong>Install seeLibrary...</strong>
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    Click <strong>Install</strong> to launch as a standalone desktop window!
                  </p>
                </div>
              </div>
            )}

            {/* Mobile Instructions */}
            {activeInstallTab === 'mobile' && (
              <div className="w-full text-left space-y-3 bg-slate-50 dark:bg-neutral-900/60 p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 text-xs text-slate-700 dark:text-neutral-300">
                <p className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider">
                  Android (Chrome / Edge):
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <p>Tap the <strong>3-dots Menu (⋮)</strong> in top right corner.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <p>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-neutral-800">
                  <p className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider mb-2">
                    iPhone / iPad (Safari):
                  </p>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <p>Tap the <strong>Share</strong> icon at the bottom of Safari.</p>
                  </div>
                  <div className="flex items-start gap-2.5 mt-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <p>Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Tab */}
            {activeInstallTab === 'qr' && (
              <div className="w-full flex flex-col items-center">
                {qrDataUrl && (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-inner mb-3">
                    <img
                      src={qrDataUrl}
                      alt="seeLibrary QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Scan with your phone camera to open and install instantly on your mobile device.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="w-full flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-3 px-3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone QR Code Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center flex flex-col items-center">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Scan to Open & Install
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 mb-4">
              Point your phone camera at the QR code to open seeLibrary directly on your device.
            </p>

            {qrDataUrl && (
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-inner mb-4">
                <img
                  src={qrDataUrl}
                  alt="seeLibrary QR Code"
                  className="w-52 h-52 object-contain"
                />
              </div>
            )}

            <div className="w-full flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>

              <a
                href={targetUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
              >
                <span>Visit</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
