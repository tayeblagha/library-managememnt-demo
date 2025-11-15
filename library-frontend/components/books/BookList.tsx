// src/components/BookList.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Book } from "../../models/Book";
import { BookService } from "../../services/BookService";
import BookCard from "./BookCard";
import useDelayedSpinner from "@/hooks/useDelayedSpinner";
import Spinner from "../Spinner";

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
  const showSpinner = useDelayedSpinner(isLoading, isAppend, {
    delayBeforeShowMs: 300,
    minVisibleMs: 1500,
  });

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
    <div className="container mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="max-w-md mx-auto relative">
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
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {(books ?? []).map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>

      {/* Loading Spinner (only when showSpinner is true) */}
      {showSpinner && (
        <div className="text-center py-8">
          <Spinner size={32} message="Loading more books..." />
        </div>
      )}

      {/* No More Books */}
      {!hasMore && books.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No more books to load
        </div>
      )}

      {/* Empty State */}
      {!isLoading && books.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-lg">
          No books found
        </div>
      )}
    </div>
  );
}
