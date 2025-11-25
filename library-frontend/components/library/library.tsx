// Your cleaned-up code without the general UI error state

"use client";

import { useState, useEffect, useCallback } from "react";
import LibraryService from "@/services/LibraryService";
import { NotificationDTO } from "@/models/NotificationDTO";
import { ReadingActivity } from "@/models/ReadingActivity";
import { swalSuccess, swalError, swalConfirm } from "@/utils/swal";

const Library = () => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [expiredBooks, setExpiredBooks] = useState<ReadingActivity[]>([]);
  const [approving, setApproving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [notificationsData, expiredBooksData] = await Promise.all([
        LibraryService.getAdminNotifications(),
        LibraryService.getExpiredBooks(),
      ]);

      setNotifications(notificationsData);
      setExpiredBooks(expiredBooksData);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (
    bookId: number,
    memberId: number,
    memberName: string,
    bookTitle: string
  ) => {
    const result = await swalConfirm(
      "Are you sure?",
      `Are you sure member "${memberName}" returned the book "${bookTitle}"?`
    );

    if (!result.isConfirmed) return;

    const key = `${bookId}-${memberId}`;
    setApproving(key);

    try {
      const res = await LibraryService.approveNextReader(bookId, memberId);

      if (res.success) {
        setNotifications((prev) =>
          prev.filter(
            (n) => !(n.book.id === bookId && n.member.id === memberId)
          )
        );

        setExpiredBooks((prev) =>
          prev.filter(
            (a) => !(a.book.id === bookId && a.member.id === memberId)
          )
        );

        await swalSuccess(
          "Approved!",
          `Book "${bookTitle}" has been approved for the next reader.`
        );

        fetchData();
      } else {
        await swalError("Error!", res.message);
      }
    } catch {
      await swalError("Error!", "Failed to approve reader");
    } finally {
      setApproving(null);
    }
  };

  const computeExpectedReturn = (hours: number | undefined | null) => {
    const hrs = typeof hours === "number" && !isNaN(hours) ? hours : 0;
    return new Date(Date.now() + hrs * 60 * 60 * 1000);
  };

  const formatDateTime = (d: Date) => d.toLocaleString();

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 ">
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
          notifications.map((n) => {
            const compositeKey = `${n.book.id}-${n.member.id}`;
            const expectedReturn = computeExpectedReturn(n.duration);

            return (
              <div
                key={compositeKey}
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

                      <div className="text-sm text-gray-500 mt-1 flex gap-3 items-center">
                        <span className="flex items-center gap-2">
                          <img
                            src={n.member.imageUrl}
                            alt={n.member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          {n.member.name}
                        </span>

                        <span className="ml-2 text-sm text-gray-600">
                          <i className="fa-solid fa-calendar-days mr-1"></i>
                          Expected:{" "}
                          <span className="font-medium">
                            {formatDateTime(expectedReturn)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleApprove(
                        n.book.id as number,
                        n.member.id as number,
                        n.member.name,
                        n.book.title
                      )
                    }
                    disabled={approving === compositeKey}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:bg-green-300 flex items-center gap-2"
                  >
                    {approving === compositeKey ? (
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
            );
          })
        )}
      </div>

      {/* Expired Books */}
      <div className="bg-white shadow rounded border overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b">
          <i className="fa-solid fa-hourglass-end text-red-600" />
          <h2 className="font-semibold">Expired Books</h2>
          <span className="ml-auto px-2 py-1 rounded text-sm bg-red-500 text-white">
            {expiredBooks.length}
          </span>
        </div>

        {expiredBooks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <i className="fa-solid fa-circle-check text-3xl mb-2" />
            <p>No expired books</p>
          </div>
        ) : (
          expiredBooks.map((a) => (
            <div key={a.id} className="p-4 border-b hover:bg-gray-50">
              <div className="flex gap-3">
                {a.book.imageUrl && (
                  <img
                    src={a.book.imageUrl}
                    className="w-12 h-16 rounded object-cover"
                  />
                )}

                <div className="flex-1">
                  <p className="font-medium">{a.book.title}</p>

                  <div className="text-sm text-gray-500 mt-1 flex gap-4 items-center">
                    <span className="flex items-center gap-2">
                      {a.member.imageUrl && (
                        <img
                          src={a.member.imageUrl}
                          className="w-5 h-7 rounded"
                        />
                      )}
                      {a.member.name}
                    </span>

                    <span>Start: {new Date(a.startTime).toLocaleDateString()}</span>

                    <span className="text-red-500 font-semibold">
                      Exp: {new Date(a.expectedEndTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-center text-gray-500 text-sm">
        <i className="fa-solid fa-circle-dot text-green-500 animate-pulse"></i>{" "}
        Auto-refresh every 3s
      </div>
    </div>
  );
};

export default Library;
