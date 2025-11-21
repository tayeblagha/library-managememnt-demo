"use client";

import React, { useEffect, useState } from "react";
import Select, { SingleValue } from "react-select";
import { Book } from "@/models/Book";
import { ReadingActivity } from "@/models/ReadingActivity";
import { MemberService } from "@/services/MemberService";
import { swalSuccess, swalInfo, swalError, swalConfirm } from "@/utils/swal";

// The type used for react-select options
type Option = {
  value: number;
  label: string;
  imageUrl: string;
  book: Book;
};

export default function MemberBookManager({ memberId }: { memberId: number }) {
  // Current member info
  const [member, setMember] = useState<any>(null);

  // Dropdown book options (only available books)
  const [options, setOptions] = useState<Option[]>([]);

  // Selected book from dropdown
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  // Books the member already borrowed
  const [borrowedBooks, setBorrowedBooks] = useState<ReadingActivity[]>([]);

  // Loading state while fetching books
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Mode toggle: read (default) or borrow
  const [mode, setMode] = useState<"read" | "borrow">("read");

  // Selected return date for borrow mode
  const [returnDate, setReturnDate] = useState<string>("");

  // Load member information once
  const loadMember = async () => {
    try {
      const m = await MemberService.getMemberById(memberId);
      setMember(m);
    } catch (error) {
      console.error("Failed to load member:", error);
    }
  };

  useEffect(() => {
    loadMember();
  }, [memberId]);

  // Fetch all available books
  const loadAvailableBooks = async () => {
    try {
      const books = await MemberService.getAvailableBooks(memberId);
      setOptions(
        books.map((b) => ({
          value: b.id!,
          label: b.title,
          imageUrl: b.imageUrl,
          book: b,
        }))
      );
    } catch (error) {
      console.error("Failed to load available books:", error);
    }
  };

  // Fetch books that the member already borrowed
  const loadBorrowedBooks = async () => {
    try {
      const list = await MemberService.getBorrowedBooks(memberId);
      setBorrowedBooks(list);
    } catch (error) {
      console.error("Failed to load borrowed books:", error);
    }
  };

  // Format date as YYYY-MM-DD for <input type="date" />
  const formatDateYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, "0");
    const dd = `${d.getDate()}`.padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Load all books when memberId changes
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingBooks(true);
      try {
        await Promise.all([loadAvailableBooks(), loadBorrowedBooks()]);
      } finally {
        setLoadingBooks(false);
      }
    };

    loadInitialData();

    // Default return date = today + 7 days
    const today = new Date();
    const defaultReturn = new Date(today);
    defaultReturn.setDate(defaultReturn.getDate() + 7);
    setReturnDate(formatDateYYYYMMDD(defaultReturn));
  }, [memberId]);

  // Handle book selection
  const handleChange = (option: SingleValue<Option>) => {
    setSelectedOption(option ?? null);
  };

  /**
   * Calculates how many hours remain until the chosen return date.
   * We send this number to the backend.
   */
  const computeHoursFromReturnDate = (selectedDateStr: string): number => {
    const now = Date.now();
    const [y, m, d] = selectedDateStr.split("-").map(Number);

    const nowTime = new Date();
    const target = new Date(
      y,
      m - 1,
      d,
      nowTime.getHours(),
      nowTime.getMinutes(),
      nowTime.getSeconds()
    ).getTime();

    const diffMs = target - now;
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return Math.max(1, hours); // At least 1 hour
  };

  // Perform read or borrow action
  const handleAction = async () => {
    if (!selectedOption) return;

    try {
      if (mode === "read") {
        // Backend gives fixed 6 hours reading time
        const res = await MemberService.readBook(memberId, selectedOption.value);

        if (res.success) {
          setOptions((prev) => prev.filter((o) => o.value !== selectedOption.value));
          swalSuccess("Book Requested (Read)", res.message);
        } else {
          swalInfo("Book Requested (Read)", `${res.message}<br/>${res.rank ? `<strong>Rank: ${res.rank}</strong>` : ""}`);
        }
      } else {
        // Borrow mode → calculate hours, then send to backend
        const hours = computeHoursFromReturnDate(returnDate);
        const res = await MemberService.borrowBook(memberId, selectedOption.value, hours);

        if (res.success) {
          setOptions((prev) => prev.filter((o) => o.value !== selectedOption.value));
          swalSuccess("Book Borrowed", res.message);
        } else {
          swalInfo(
            "Book Borrowed",
            `${res.message}<br/>${res.rank ? `<strong> Rank: ${res.rank}</strong>` : ""}`
          );
        }
      }

      setSelectedOption(null);
      await loadBorrowedBooks();
    } catch (error) {
      console.error("Failed to perform action:", error);
      swalError("Error", "Failed to perform action. Please try again.");
    }
  };

  // Return a borrowed book
  const handleReturn = async (activity: ReadingActivity) => {
    const result = await swalConfirm(
      "Return Book?",
      `Are you sure member "${activity.member.name}" returned "${activity.book.title}"?`
    );

    if (result.isConfirmed) {
      try {
        const res = await MemberService.returnBook(activity.id!);
        swalSuccess("Book Returned", res.message);
        await Promise.all([loadAvailableBooks(), loadBorrowedBooks()]);
      } catch (error) {
        console.error("Failed to return book:", error);
        swalError("Error", "Failed to return book. Please try again.");
      }
    }
  };

  return (
    <div className="w-[360px] mx-auto mt-6">
      {/* Member header */}
      <div className="flex flex-col items-center gap-2 mb-4">
        <img
          src={member?.imageUrl}
          className="w-12 h-12 rounded-full object-cover"
          alt={member?.name}
        />
        <span className="font-semibold text-center">{member?.name}</span>
      </div>

      <h3 className="text-lg font-semibold mb-3">Read / Borrow a Book</h3>

      {/* While loading */}
      {loadingBooks ? (
        <p className="text-gray-500">Loading books...</p>
      ) : (
        <>
          {/* Mode toggle */}
          <div className="mb-3 flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Read radio */}
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "read"}
                  onChange={() => setMode("read")}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">Read</span>
              </label>

              {/* Borrow radio */}
              <label className="inline-flex items-center cursor-pointer ml-4">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "borrow"}
                  onChange={() => setMode("borrow")}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">Borrow</span>
              </label>
            </div>

            {/* Show return date only in borrow mode */}
            {mode === "borrow" && (
              <div>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={formatDateYYYYMMDD(new Date())}
                  className="px-2 py-1 border rounded text-sm"
                />
              </div>
            )}
          </div>

          {/* Book dropdown + Action button */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select
                options={options}
                value={selectedOption}
                onChange={handleChange}
                isClearable
                placeholder="Select a book..."
                className="text-black"
                formatOptionLabel={(opt) => (
                  <div className="flex items-center gap-2">
                    <img
                      src={opt.imageUrl}
                      className="w-9 h-12 object-cover rounded"
                      alt={opt.label}
                    />
                    <div>
                      <div>{opt.label}</div>
                      <div className="text-xs opacity-60">{opt.book.author}</div>
                    </div>
                  </div>
                )}
              />
            </div>

            <button
              onClick={handleAction}
              disabled={
                !selectedOption ||
                !member?.active ||
                (mode === "borrow" && !returnDate)
              }
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
            >
              {mode === "read" ? (
                <>
                  <i className="fa-solid fa-book-medical mr-2"></i>Read
                </>
              ) : (
                <>
                  <i className="fa-solid fa-book-medical mr-2"></i>Borrow
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* Borrowed books section */}
      <h3 className="text-lg font-semibold mt-8 mb-3">Borrowed Books</h3>

      {borrowedBooks.length === 0 ? (
        <p className="text-gray-500">No borrowed books.</p>
      ) : (
        borrowedBooks.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center p-3 border border-gray-300 rounded mb-3 gap-3 bg-white shadow-sm"
          >
            <img
              src={activity.book.imageUrl}
              className="w-10 h-14 object-cover rounded"
              alt={activity.book.title}
            />

            <div className="flex-1">
              <strong>{activity.book.title}</strong>

              {/* Book times */}
              <div className="text-[11px] mt-1 opacity-70 font-bold">
                <div className="text-[10px] mt-1 font-bold">
                  <div>
                    Start: <i className="fa-solid fa-calendar-days"></i>{" "}
                    {new Date(activity.startTime).toLocaleString()}
                  </div>
                  <div>
                    End <i className="fa-solid fa-calendar-days"></i>:{" "}
                    {new Date(activity.expectedEndTime).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Return button */}
            <button
              disabled={!member?.active}
              onClick={() => handleReturn(activity)}
              className="disabled:bg-gray-400 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 transition-colors"
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        ))
      )}

      {/* Warning for inactive members */}
      {!member?.active && (
        <span className="text-sm text-yellow-500 flex items-center gap-1 mt-2">
          Only active members can request or return a book{" "}
          <i className="fa-solid fa-exclamation"></i>
        </span>
      )}
    </div>
  );
}
