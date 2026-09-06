import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base mb-4 shadow-md">
        sL
      </div>
      <h2 className="text-3xl font-black mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-400 max-w-sm mb-6">
        The page or resource you are looking for does not exist in seeLibrary.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
      >
        Return to seeLibrary Home
      </Link>
    </div>
  );
}
