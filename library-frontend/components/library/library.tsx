"use client";

import { useState, useEffect, useCallback } from "react";
import LibraryService from "@/services/LibraryService";
import { NotificationDTO } from "@/models/NotificationDTO";
import { ReadingActivity } from "@/models/ReadingActivity";
import Swal from "sweetalert2";

const Library = () => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [expiredBooks, setExpiredBooks] = useState<ReadingActivity[]>([]);
  const [approving, setApproving] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [notificationsData, expiredBooksData] = await Promise.all([
        LibraryService.getAdminNotifications(),
        LibraryService.getExpiredBooks(),
      ]);

      setNotifications(notificationsData);
      setExpiredBooks(expiredBooksData);
    } catch {
      setError("Failed to fetch data");
    }
  }, []);

  useEffect(() => {
    // initial load
    fetchData();
  }, [fetchData]);

  // auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (
    bookId: number,
    memberName: string,
    bookTitle: string
  ) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Are you sure member "${memberName}" returned the book "${bookTitle}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, approve!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    setApproving(bookId);
    try {
      const result = await LibraryService.approveNextReader(bookId);
      if (result.success) {
        setNotifications((prev) => prev.filter((n) => n.book.id !== bookId));
        // Show success message
        await Swal.fire({
          title: "Approved!",
          text: `Book "${bookTitle}" has been approved for the next reader.`,
          icon: "success",
          confirmButtonColor: "#10B981",
        });
        // refresh to get updated expiredBooks or other state from server
        fetchData();
      } else {
        setError(result.message);
        await Swal.fire({
          title: "Error!",
          text: result.message,
          icon: "error",
          confirmButtonColor: "#EF4444",
        });
      }
    } catch {
      setError("Failed to approve reader");
      await Swal.fire({
        title: "Error!",
        text: "Failed to approve reader",
        icon: "error",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setApproving(null);
    }
  };

  const formatTime = (t: string) => new Date(t).toLocaleTimeString();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded relative">
          {error}
          <button
            onClick={() => setError(null)}
            className="absolute right-2 top-2"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Notifications */}
      <div className="bg-white shadow rounded border">
        <div className="p-4 border-b flex items-center gap-2">
          <i className="fa-solid fa-bell text-blue-600"></i>
          <h2 className="font-semibold text-lg">Pending Notifications</h2>
          <span className="ml-auto bg-blue-500 text-white px-2 py-1 rounded text-sm">
            {notifications.length}
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <i className="fa-solid fa-book-open text-3xl mb-2"></i>
            <p>No pending notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.book.id + "-" + n.member.id}
              className="p-4 border-b last:border-0 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-3">
                  {n.book.imageUrl && (
                    <img
                      src={n.book.imageUrl}
                      alt={n.book.title}
                      className="w-12 h-16 rounded object-cover"
                    />
                  )}

                  <div>
                    <p className="font-medium">{n.book.title}</p>
                    <p className="text-sm text-gray-600">{n.book.author}</p>

                    <div className="text-sm text-gray-500 mt-1 flex gap-3">
                      <span>
                        <i className="fa-solid fa-user"></i> {n.member.name}
                      </span>
                      <span>
                        <i className="fa-solid fa-clock"></i>{" "}
                        {formatTime(n.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() =>
                    n.book.id !== undefined &&
                    handleApprove(n.book.id, n.member.name, n.book.title)
                  }
                  disabled={approving === n.book.id}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:bg-green-300 flex items-center gap-2"
                >
                  {approving === n.book.id ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i>
                      Approving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Approve
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Expired Books */}
      <div className="bg-white shadow rounded border">
        <div className="p-4 border-b flex items-center gap-2">
          <i className="fa-solid fa-hourglass-end text-red-600"></i>
          <h2 className="font-semibold text-lg">Expired Books</h2>
          <span className="ml-auto bg-red-500 text-white px-2 py-1 rounded text-sm">
            {expiredBooks.length}
          </span>
        </div>

        {expiredBooks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <i className="fa-solid fa-circle-check text-3xl mb-2"></i>
            <p>No expired books</p>
          </div>
        ) : (
          expiredBooks.map((a) => (
            <div
              key={a.id}
              className="p-4 border-b last:border-0 hover:bg-gray-50"
            >
              <div className="flex gap-3">
                {a.book.imageUrl && (
                  <img
                    src={a.book.imageUrl}
                    className="w-12 h-16 object-cover rounded"
                  />
                )}

                <div className="flex-1">
                  <p className="font-medium">{a.book.title}</p>
                  <p className="text-sm text-gray-600">{a.book.author}</p>

                  <div className="text-sm text-gray-500 mt-1 flex gap-4">
                    <span>
                      <i className="fa-solid fa-user"></i> {a.member.name}
                    </span>
                    <span>
                      Start: {new Date(a.startTime).toLocaleDateString()}
                    </span>
                    <span className="text-red-500 font-semibold">
                      Exp: {new Date(a.expectedEndTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                  EXPIRED
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-center text-gray-500 text-sm">
        <i className="fa-solid fa-circle-dot text-green-500 animate-pulse"></i>{" "}
        Auto-refresh every 5s
      </div>
    </div>
  );
};

export default Library;
