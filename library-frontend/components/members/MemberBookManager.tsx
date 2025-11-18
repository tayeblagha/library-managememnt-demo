"use client";

import React, { useEffect, useState } from "react";
import Select, { SingleValue } from "react-select";
import Swal from "sweetalert2";
import { Book } from "@/models/Book";
import { ReadingActivity } from "@/models/ReadingActivity";
import { MemberService } from "@/services/MemberService";

type Option = {
  value: number;
  label: string;
  imageUrl: string;
  book: Book;
};

export default function MemberBookManager({ memberId }: { memberId: number;}) {
  const [member, setMember] = useState<any>(null);

  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<ReadingActivity[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Mode: "read" (default) or "borrow"
  const [mode, setMode] = useState<"read" | "borrow">("read");

  // For borrow: selected return date (yyyy-MM-dd)
  const [returnDate, setReturnDate] = useState<string>("");

  // Load member
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

  // Load available books
  const loadAvailableBooks = async () => {
    try {
      const books = await MemberService.getAvailableBooks(memberId);
      const mapped: Option[] = books.map((b) => ({
        value: b.id!,
        label: b.title,
        imageUrl: b.imageUrl,
        book: b,
      }));
      setOptions(mapped);
    } catch (error) {
      console.error("Failed to load available books:", error);
    }
  };

  // Load borrowed books
  const loadBorrowedBooks = async () => {
    try {
      const list = await MemberService.getBorrowedBooks(memberId);
      setBorrowedBooks(list);
    } catch (error) {
      console.error("Failed to load borrowed books:", error);
    }
  };
  const formatDateYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, "0");
    const dd = `${d.getDate()}`.padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

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
    // set default return date to today + 7 days
    const today = new Date();
    const defaultReturn = new Date(today);
    defaultReturn.setDate(defaultReturn.getDate() + 7);
    setReturnDate(formatDateYYYYMMDD(defaultReturn));
  }, [memberId]);

  

  const handleChange = (option: SingleValue<Option>) => {
    setSelectedOption(option ?? null);
  };

  // --- Simplified: compute number of hours (integer) between now and chosen returnDate
  // returns a Number (int), minimum 1
  const computeHoursFromReturnDate = (selectedDateStr: string): number => {
    const now = Date.now();
    const [y, m, d] = selectedDateStr.split("-").map((s) => Number(s));
    // create a target date using current time-of-day to avoid midnight timezone surprises
    const nowTime = new Date();
    const target = new Date(y, m - 1, d, nowTime.getHours(), nowTime.getMinutes(), nowTime.getSeconds()).getTime();
    const diffMs = target - now;
    const hours = Math.ceil(diffMs / (1000 * 60 * 60));
    return Math.max(1, hours); // always at least 1 hour
  };

  const handleAction = async () => {
    if (!selectedOption) return;

    try {
      if (mode === "read") {
        // readBook uses fixed 6 hours in backend
        const res = await MemberService.readBook(memberId, selectedOption.value);

        if (res.success) {
          setOptions((prev) =>
            prev.filter((option) => option.value !== selectedOption.value)
          );
          Swal.fire({
            icon: "success",
            title: "Book Requested (Read)",
            text: res.message,
            timer: 5000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "info",
            title: "Book Requested (Read)",
            html: `
              ${res.message}<br/>
              ${res.rank ? `<strong> Rank   : ${res.rank}</strong>` : ""}
            `,
            timer: 8000,
            showConfirmButton: false,
          });
        }
      } else {
        // borrow -> compute hours (integer) and send to backend
        const hours = computeHoursFromReturnDate(returnDate);
        // hours IS a number (int) now
        const res = await MemberService.borrowBook(memberId, selectedOption.value, hours);

        if (res.success) {
          setOptions((prev) =>
            prev.filter((option) => option.value !== selectedOption.value)
          );
          Swal.fire({
            icon: "success",
            title: "Book Borrowed",
            text: res.message,
            timer: 5000,
            showConfirmButton: false,
          });
        } else {
          Swal.fire({
            icon: "info",
            title: "Book Borrowed",
            html: `
              ${res.message}<br/>
              ${res.rank ? `<strong> Rank   : ${res.rank}</strong>` : ""}
            `,
            timer: 8000,
            showConfirmButton: false,
          });
        }
      }

      setSelectedOption(null);
      await loadBorrowedBooks();
    } catch (error) {
      console.error("Failed to perform action:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to perform action. Please try again.",
      });
    }
  };

  const handleReturn = async (activity: ReadingActivity) => {
    const result = await Swal.fire({
      title: `Return Book?`,
      text: `Are you sure member "${activity.member.name}" returned the book "${activity.book.title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, return it!",
    });

    if (result.isConfirmed) {
      try {
        const res = await MemberService.returnBook(activity.id!);

        Swal.fire({
          icon: "success",
          title: "Book Returned",
          text: res.message,
          timer: 2000,
          showConfirmButton: false,
        });

        await Promise.all([loadAvailableBooks(), loadBorrowedBooks()]);
      } catch (error) {
        console.error("Failed to return book:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to return book. Please try again.",
        });
      }
    }
  };

  return (
    <div className="w-[360px] mx-auto mt-6">
      <div className="flex flex-col items-center gap-2 mb-4">
        <img
          src={member?.imageUrl}
          className="w-12 h-12 rounded-full object-cover"
          alt={member?.name}
        />
        <span className="font-semibold text-center">{member?.name}</span>
      </div>

      <h3 className="text-lg font-semibold mb-3">Read / Borrow a Book</h3>

      {loadingBooks ? (
        <p className="text-gray-500">Loading books...</p>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "read"}
                  onChange={() => setMode("read")}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm">Read </span>
              </label>

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

            {/* If borrow, show date picker */}
            {mode === "borrow" && (
              <div >
                  
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

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Select<Option, false>
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
                <><i className="fa-solid fa-book-medical mr-2"></i>Read</>
              ) : (
                <><i className="fa-solid fa-book-medical mr-2"></i>Borrow</>
              )}
            </button>
          </div>

         
        </>
      )}

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
              <strong className="block">{activity.book.title}</strong>
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

            <button  disabled={!member?.active }
              onClick={() => handleReturn(activity)}
              className="disabled:bg-gray-400 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 transition-colors"
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        ))
      )}


       {!member?.active && (
            <span className="text-sm text-yellow-500 flex items-center gap-1 mt-2">
              only active Members can request or return a book <i className="fa-solid fa-exclamation"></i>
            </span>
          )}
    </div>
  );
}
