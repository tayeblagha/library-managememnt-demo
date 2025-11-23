"use client"; // <-- Required because we use a hook

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname(); // current route

  return (
    <>
      {/* Header wrapper
          bg-white → white background
          shadow-sm → small subtle shadow */}
      <header className="bg-white shadow-sm">

        {/* Inner container
            container → responsive width wrapper
            mx-auto → automatic horizontal margin
            flex → horizontal layout
            items-center → vertically center items
            justify-between → push left/right elements apart
            px-4 → horizontal padding
            py-4 → vertical padding */}
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          
          {/* Logo Section wrapper
              flex → align logo + text side by side
              items-center → vertically center
              gap-3 → spacing between logo and text */}
          <div className="flex items-center gap-3">

            {/* Logo circle
                flex items-center justify-center → center icon inside circle
                h-12 w-12 → fixed square size
                rounded-full → perfect circle
                bg-linear-to-tr → gradient background
                from-indigo-500 to-pink-500 → gradient colors
                text-white → white icon color
                shadow-md → medium shadow for depth */}
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-linear-to-tr from-indigo-500 to-pink-500 text-white shadow-md">
              <i className="fa-solid fa-book-open text-xl"></i>
            </div>

            {/* Text block under logo */}
            <div>
              {/* Title
                  text-2xl → large font size
                  font-bold → bold text */}
              <h1 className="text-2xl font-bold">Library Management</h1>

              {/* Subtitle
                  text-xs → extra small text
                  text-gray-500 → light gray color */}
              <p className="text-xs text-gray-500">Browse, manage and lend books</p>
            </div>
          </div>

          {/* Navigation wrapper
              flex → horizontal menu
              items-center → vertically center
              gap-6 → spacing between menu items */}
          <nav className="flex items-center gap-6">

            {/* Link: Books
                pb-1 → small bottom padding
                text-lg → medium-large text
                font-semibold → semi-bold text
                
                Active state:
                border-b-2 → bottom underline
                border-indigo-600 → underline color
                text-indigo-600 → active text color
                
                Inactive state:
                text-gray-600 → gray text
                hover:text-indigo-600 → becomes indigo on hover */}
            <Link
              href="/"
              className={`pb-1 text-lg font-semibold ${
                pathname === "/"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              Books <i className="fa-solid fa-book"></i>
            </Link>

            {/* Link: Members */}
            <Link
              href="/members"
              className={`pb-1 text-lg font-semibold ${
                pathname === "/members"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              Members <i className="fa fa-users" aria-hidden="true"></i>
            </Link>

            {/* Link: Reading Activity */}
            <Link
              href="/library"
              className={`pb-1 text-lg font-semibold ${
                pathname === "/library"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              Reading Activity <i className="fas fa-book-reader"></i>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
