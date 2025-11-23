// src/components/BookList.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Book } from "../../models/Book";
import { BookService } from "../../services/BookService";
import BookCard from "./BookCard";
import useDelayedSpinner from "@/hooks/useDelayedSpinner";
import Spinner from "../spinner/Spinner";

export default function BookList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");

  const pageSize = 9;

  // use the hook: only show spinner for append (page > 0)
  const isAppend = currentPage > 0;
  const showSpinner = useDelayedSpinner(isLoading, isAppend);

  const loadBooks = useCallback(
    async (append = false) => {
      if (isLoadingRef.current) return;

      setIsLoading(true);
      isLoadingRef.current = true;

      try {
        // Apply an artificial delay for append loads so the spinner behavior is visible.
        const delayPromise = append
          ? new Promise((r) => setTimeout(r, 1500))
          : Promise.resolve();

        const [response] = await Promise.all([
          BookService.searchBooksByTitle(searchTerm, currentPage, pageSize),
          delayPromise,
        ]);

        const newBooks = Array.isArray(response?.content)
          ? response.content
          : [];
        setBooks((prev) => (append ? [...prev, ...newBooks] : newBooks));
        setHasMore(response?.last === false);
      } catch (error) {
        console.error("Error loading books:", error);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [searchTerm, currentPage, pageSize]
  );

  // initial search / when searchTerm changes: load fresh (no spinner)
  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    loadBooks(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // scroll listener => increment page
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingRef.current || !hasMore) return;

      const position = window.scrollY + window.innerHeight;
      const height = document.documentElement.scrollHeight;
      if (position >= height - 100) {
        setCurrentPage((prev) => prev + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore]);

  // when page increases, load more (append)
  useEffect(() => {
    if (currentPage > 0) {
      loadBooks(true);
    }
  }, [currentPage, loadBooks]);
return (
  <>
    {/* Main container
        container → responsive max-width wrapper
        mx-auto → center horizontally
        px-4 → horizontal padding inside container
        py-8 → large vertical padding */}
    <div className="container mx-auto px-4 py-8">

      {/* Search Bar section
          mb-8 → space below search bar */}
      <div className="mb-8">

        {/* Inner search bar wrapper
            max-w-md → limit width to medium size
            mx-auto → horizontally center
            relative → needed for absolutely positioned icon */}
        <div className="max-w-md mx-auto relative">

          {/* Search input
              w-full → take full width
              px-4 → left/right padding
              py-3 → top/bottom padding
              pl-12 → extra left padding to make space for icon
              pr-4 → right padding
              border border-gray-300 → light border
              rounded-lg → rounded corners
              focus:outline-none → remove default browser outline
              focus:ring-2 → show ring when focused
              focus:ring-blue-500 → blue focus highlight */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
              setHasMore(true);
            }}
            placeholder="Search books by title..."
            className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Search icon wrapper
              absolute 
              inset-y-0 → stretch vertically from top to bottom    makes the icon vertically centered automatically
              left-0 → stick to left side
              flex items-center → vertically center icon
              pl-4 → spacing from left border */}
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <i className="fas fa-search text-gray-400"></i>
          </div>
        </div>
      </div>

      {/* Books Grid
          grid → enable grid layout
          grid-cols-1 → 1 column on mobile
          sm:grid-cols-2 → 2 columns on small screens
          md:grid-cols-3 → 3 columns on medium screens
          gap-6 → spacing between book cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {(books ?? []).map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>

      {/* Loading spinner wrapper
          text-center → center horizontally
          py-8 → spacing above/below spinner */}
      {showSpinner && (
        <div className="text-center py-8">
          <Spinner size={32} message="Loading more books..." />
        </div>
      )}

      {/* "No more books" message
          text-center → center text
          py-8 → spacing
          text-gray-500 → muted text color */}
      {!hasMore && books.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No more books to load
        </div>
      )}

      {/* Empty state message
          text-center → center text
          py-12 → large vertical padding
          text-gray-500 → muted color
          text-lg → larger font */}
      {!isLoading && books.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-lg">
          No books found
        </div>
      )}
    </div>
  </>
);

}
