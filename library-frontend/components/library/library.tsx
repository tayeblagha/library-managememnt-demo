"use client";

import { useState, useEffect, useCallback } from "react";
import LibraryService from "@/services/LibraryService";
import { NotificationDTO } from "@/models/NotificationDTO";
import { ReadingActivity } from "@/models/ReadingActivity";
import {
  swalSuccess,
  swalError,
  swalConfirm,
} from "@/utils/swal";

const Library = () => {
  // component state
  // notifications -> pending "approve" requests shown to admin
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);

  // expiredBooks -> list of reading activities that are past due
  const [expiredBooks, setExpiredBooks] = useState<ReadingActivity[]>([]);

  // approving -> composite key ("bookId-memberId") while a request is in flight
  // used to disable only the specific approve button
  const [approving, setApproving] = useState<string | null>(null);

  // error -> general UI-level error message container
  const [error, setError] = useState<string | null>(null);

  // fetchData -> load notifications and expired books in parallel
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

  // initial load once on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // handleApprove -> confirm + call API + update local lists
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

    if (!result.isConfirmed) {
      return;
    }

    const key = `${bookId}-${memberId}`;
    setApproving(key);
    try {
      // pass memberId as second argument
      const res = await LibraryService.approveNextReader(bookId, memberId);
      if (res.success) {
        // remove only the notification matching both bookId and memberId
        setNotifications((prev) =>
          prev.filter((n) => !(n.book.id === bookId && n.member.id === memberId))
        );
        // also remove expiredBooks entry if it matches both bookId and memberId
        setExpiredBooks((prev) =>
          prev.filter((a) => !(a.book.id === bookId && a.member.id === memberId))
        );

        await swalSuccess(
          "Approved!",
          `Book "${bookTitle}" has been approved for the next reader.`
        );

        // refresh to get updated expiredBooks or other server state
        fetchData();
      } else {
        setError(res.message);
        await swalError("Error!", res.message);
      }
    } catch {
      setError("Failed to approve reader");
      await swalError("Error!", "Failed to approve reader");
    } finally {
      setApproving(null);
    }
  };

  const formatTime = (t: string) => new Date(t).toLocaleTimeString();

  // --- NEW HELPERS ---
  // computeExpectedReturn -> returns Date object representing now + hours
  const computeExpectedReturn = (hours: number | undefined | null) => {
    const hrs = typeof hours === "number" && !isNaN(hours) ? hours : 0;
    return new Date(Date.now() + hrs * 60 * 60 * 1000);
  };

  const formatDateTime = (d: Date) => d.toLocaleString();

  return (
    // OUTER CONTAINER: center layout, max width, spacing
    // max-w-4xl -> constrain width on large screens
    // mx-auto -> center horizontally
    // p-4 -> padding all around
    // space-y-6 -> vertical spacing between sections
    <div className="max-w-4xl mx-auto p-4 space-y-6 ">

      {/* ERROR BANNER */}
      {/*
        bg-red-100 -> light red background for error
        text-red-700 -> darker red text for contrast
        p-3 -> padding
        rounded -> small border radius
        relative -> so the close button can be absolutely positioned
      */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded relative">
          {error}
          {/* close button positioned top-right */}
          <button
            onClick={() => setError(null)}
            className="absolute right-2 top-2"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Notifications */}
      {/*
        Container styles:
        bg-white -> white card background
        shadow -> subtle drop shadow
        rounded -> rounded corners
        border -> thin border for definition
      */}
      <div className="bg-white shadow rounded border">
        {/*
          Header row for notifications
          p-4 -> padding
          border-b -> bottom divider
          flex items-center gap-2 -> horizontal layout, vertical centering, small gaps
        */}
        <div className="p-4 border-b flex items-center gap-2">
          <i className="fa-solid fa-bell text-blue-600"></i>
          <h2 className="font-semibold text-lg">Pending Notifications</h2>
          {/* badge showing count aligned to right */}
          <span className="ml-auto bg-blue-500 text-white px-2 py-1 rounded text-sm">
            {notifications.length}
          </span>
        </div>

        {/* empty state vs list */}
        {notifications.length === 0 ? (
          // empty state: padded center text
          <div className="p-6 text-center text-gray-500">
            <i className="fa-solid fa-book-open text-3xl mb-2"></i>
            <p>No pending notifications</p>
          </div>
        ) : (
          // list of notification items
          notifications.map((n) => {
            const compositeKey = `${n.book.id}-${n.member.id}`;
            const expectedReturn = computeExpectedReturn(n.duration);
            return (
              // item container
              // p-4 -> padding
              // border-b -> divider between items
              // last:border-0 -> remove bottom border on last item
              // hover:bg-gray-50 -> subtle hover highlight
              <div
                key={compositeKey}
                className="p-4 border-b last:border-0 hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    {/* book thumbnail (optional) */}
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
                          {/* member avatar + name */}
                          <img
                            src={n.member.imageUrl}
                            alt={n.member.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          {n.member.name}
                        </span>

                        {/* NEW: expected return date display */}
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

                  {/* Approve button */}
                  {/*
                    Button styles explained:
                    bg-green-500 -> primary green background
                    text-white -> white text for contrast
                    px-3 py-1 -> horizontal and vertical padding
                    rounded -> small radius
                    hover:bg-green-600 -> darker green on hover
                    disabled:bg-green-300 -> muted look when disabled
                    flex items-center gap-2 -> show icon + label aligned
                  */}
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
                    aria-disabled={approving === compositeKey}
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
      {/*
        Card container with overflow-hidden to keep images inside
        header similar to notifications
      */}
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
            // each expired item
            <div key={a.id} className="p-4 border-b hover:bg-gray-50">
              <div className="flex gap-3">
                {/* thumbnail if available */}
                {a.book.imageUrl && (
                  <img src={a.book.imageUrl} className="w-12 h-16 rounded object-cover" />
                )}

                <div className="flex-1">
                  <p className="font-medium">{a.book.title}</p>

                  <div className="text-sm text-gray-500 mt-1 flex gap-4 items-center">
                    <span className="flex items-center gap-2">
                      {a.member.imageUrl && (
                        <img src={a.member.imageUrl} className="w-5 h-7 rounded" />
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

      {/* Footer auto-refresh note */}
      <div className="text-center text-gray-500 text-sm">
        <i className="fa-solid fa-circle-dot text-green-500 animate-pulse"></i>{" "}
        Auto-refresh every 3s
      </div>
    </div>
  );
};

export default Library;
