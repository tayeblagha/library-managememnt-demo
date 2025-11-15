"use client";

import React, { useEffect, useState } from "react";
import Select, { SingleValue } from "react-select";
import Swal from "sweetalert2"; // <-- import SweetAlert
import { Book } from "@/models/Book";
import { ReadingActivity } from "@/models/ReadingActivity";
import { MemberService } from "@/services/MemberService";

type Option = {
  value: number;
  label: string;
  imageUrl: string;
  book: Book;
};

export default function MemberBookManager({ memberId = 1 }: { memberId: number }) {

    const [member, setMember] = useState<any>(null);

  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [borrowedBooks, setBorrowedBooks] = useState<ReadingActivity[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

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

  const loadBorrowedBooks = async () => {
    try {
      const list = await MemberService.getBorrowedBooks(memberId);
      setBorrowedBooks(list);
    } catch (error) {
      console.error("Failed to load borrowed books:", error);
    }
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
  }, [memberId]);

  const handleChange = (option: SingleValue<Option>) => {
    setSelectedOption(option ?? null);
  };

  const requestBook = async () => {
    if (!selectedOption) return;

    try {
      const res = await MemberService.requestBook(memberId, selectedOption.value);

     

      // Remove the borrowed book from available options
      if (res.success){
        setOptions(prev => prev.filter(option => option.value !== selectedOption.value));
         // SweetAlert success message
      Swal.fire({
        icon: "success",
        title: "Book Requested",
        text: res.message,
        timer: 10000,
        showConfirmButton: false,
      });}
      else {
           Swal.fire({
        icon: "info",
        title: "Book Requested",
         html: `
      ${res.message}<br/>
      ${res.rank ? `<strong> Rank   : ${res.rank}</strong>` : ""}
    `,
        timer: 10000,
        showConfirmButton: false,
      });}
      
      
      
      setSelectedOption(null);

      // Reload borrowed books
      await loadBorrowedBooks();
    } catch (error) {
      console.error("Failed to request book:", error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to request book. Please try again.",
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

        // Reload both lists
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





      <h3 className="text-lg font-semibold mb-3">Request a Book</h3>

      {loadingBooks ? (
        <p className="text-gray-500">Loading books...</p>
      ) : (
        <>
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
              onClick={requestBook}
              disabled={!selectedOption || !member.active }
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
            >
              <i className="fa-solid fa-book-medical"></i>
            </button>
            
          </div>
                {!member.active && (
  <span className="text-sm text-yellow-500 flex items-center gap-1 mt-2">
    only active Members can request a book <i className="fa-solid fa-exclamation"></i>
  </span>
)}


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

            <button
              onClick={() => handleReturn(activity)}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 transition-colors"
            >
              <i className="fa-solid fa-rotate-left"></i>
            </button>
          </div>
        ))
      )}
    </div>
  );
}
