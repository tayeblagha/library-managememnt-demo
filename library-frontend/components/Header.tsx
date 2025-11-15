"use client"; // <-- Required because we use a hook

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname(); // current route

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 text-white flex items-center justify-center shadow-md">
            <i className="fa-solid fa-book-open text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Library Management</h1>
            <p className="text-xs text-gray-500">
              Browse, manage and lend books
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className={`text-lg font-semibold pb-1 ${
              pathname === "/"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-indigo-600"
            }`}
          >
            Books <i className="fa-solid fa-book"></i>
          </Link>

          <Link
            href="/members"
            className={`text-lg font-semibold pb-1 ${
              pathname === "/members"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-indigo-600"
            }`}
          >
            Members <i className="fa fa-users" aria-hidden="true"></i>
          </Link>

          <Link
            href="/library"
            className={`text-lg font-semibold pb-1 ${
              pathname === "/library"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-600 hover:text-indigo-600"
            }`}
          >
            Reading Activity <i className="fas fa-book-reader"></i>
          </Link>
        </nav>
      </div>
    </header>
  );
}
