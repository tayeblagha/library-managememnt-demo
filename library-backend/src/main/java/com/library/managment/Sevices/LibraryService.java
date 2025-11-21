package com.library.managment.Sevices;

import com.library.managment.dto.BookBorrowResponse;
import com.library.managment.dto.BookMemberDTO;
import com.library.managment.model.Book;
import com.library.managment.model.Member;
import com.library.managment.model.Notification;
import com.library.managment.model.ReadingActivity;
import com.library.managment.repository.BookRepository;
import com.library.managment.repository.MemberRepository;
import com.library.managment.repository.ReadingActivityRepository;
import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
@Service
public class LibraryService {

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ReadingActivityRepository readingActivityRepository;

    // Maximum number of members to notify when a book becomes available
    private static final int NOTIFY_LIMIT = 3;

    // Stores IDs of users currently inside the library (thread-safe)
    private final Set<Long> activeUsers = ConcurrentHashMap.newKeySet();

    // Waiting list for each book (BookId -> ordered set of memberIds)
    private final Map<Long, LinkedHashSet<Long>> bookWaitList = new ConcurrentHashMap<>();

    // Tracks how long each member wants to read a book
    private final Map<BookMemberDTO, Integer> durationTracker = new ConcurrentHashMap<>();

    // Stores who should be notified about available copies (BookId -> top members)
    private final Map<Long, LinkedHashSet<Long>> bookNotificationMembers = new ConcurrentHashMap<>();

    // Maps each member to the books they are currently waiting for
    private final Map<Long, Set<Long>> memberWaitingBooks = new ConcurrentHashMap<>();

    // Locks to avoid race conditions on each book
    private final Map<Long, Lock> bookLocks = new ConcurrentHashMap<>();


    /**
     * Runs ONCE at application start.
     * Loads all active members from database into the in-memory "activeUsers" list.
     */
    @PostConstruct
    public void initializeActiveMembers() {
        System.out.println("🚀 Initializing active members on first run...");
        List<Member> activeMembers = memberRepository.findByIsActiveTrue();
        for (Member m : activeMembers) {
            activeUsers.add(m.getId());
        }
        System.out.println("Active users initialized: " + activeUsers);
    }


    // Get or create a lock for a specific book (fine-grained locking)
    private Lock getBookLock(Long bookId) {
        return bookLocks.computeIfAbsent(bookId, k -> new ReentrantLock());
    }


    // Remove all duration entries for this member (cleanup)
    public void removeDurationTrackerByMemberId(Long memberId) {
        durationTracker.keySet().removeIf(key -> key.getMemberId().equals(memberId));
    }


    /**
     * Scheduled job running every day at 20:00.
     * Clears all in-memory structures and resets all members to inactive.
     */
    @Scheduled(cron = "0 0 20 * * *")
    public void resetLibraryMemory() {
        System.out.println("🕗 Clearing in-memory data for new day... " + LocalDateTime.now());

        // Clear all cached data
        activeUsers.clear();
        bookWaitList.clear();
        bookNotificationMembers.clear();
        memberWaitingBooks.clear();
        durationTracker.clear();
        bookLocks.clear();

        // Mark all members inactive in DB
        List<Member> allMembers = memberRepository.findAll();
        for (Member m : allMembers) {
            m.setActive(false);
        }
        memberRepository.saveAll(allMembers);
    }


    // Add/remove a book from a member's waiting list helper
    private void updateMemberWaitingBooks(Long memberId, Long bookId, boolean add) {
        if (add) {
            memberWaitingBooks.computeIfAbsent(memberId, k -> ConcurrentHashMap.newKeySet())
                    .add(bookId);
        } else {
            Set<Long> books = memberWaitingBooks.get(memberId);
            if (books != null) {
                books.remove(bookId);
                if (books.isEmpty()) {
                    memberWaitingBooks.remove(memberId);
                }
            }
        }
    }


    /**
     * Refresh the top notification candidates for a book.
     * Keeps only the first NOTIFY_LIMIT active members from the queue.
     */
    private void refillNotifications(Long bookId) {
        LinkedHashSet<Long> waitingQueue = bookWaitList.get(bookId);
        if (waitingQueue == null || waitingQueue.isEmpty()) {
            bookNotificationMembers.remove(bookId);
            return;
        }

        Book book = bookRepository.findById(bookId).orElse(null);
        if (book == null) return;

        // If no copies are available – we do not notify anyone
        if (book.getAvailableCopies() == 0) {
            bookNotificationMembers.remove(bookId);
            return;
        }

        LinkedHashSet<Long> notifiedMembers = new LinkedHashSet<>();
        Iterator<Long> iterator = waitingQueue.iterator();

        // Take the first NOTIFY_LIMIT valid/active members
        while (iterator.hasNext() && notifiedMembers.size() < NOTIFY_LIMIT) {
            Long memberId = iterator.next();

            // Remove invalid members from queue
            if (!activeUsers.contains(memberId) || !memberRepository.existsById(memberId)) {
                iterator.remove();
                updateMemberWaitingBooks(memberId, bookId, false);
                removeDurationTrackerByMemberId(memberId);
                continue;
            }

            notifiedMembers.add(memberId);
        }

        if (notifiedMembers.isEmpty()) {
            bookNotificationMembers.remove(bookId);
        } else {
            bookNotificationMembers.put(bookId, notifiedMembers);
        }
    }


    // Mark user as inside the library
    public void userEntersLibrary(Long memberId) {
        activeUsers.add(memberId);
    }


    /**
     * When user leaves the library:
     * - Remove them from waiting lists
     * - Remove their notifications
     * - Clean up their duration tracker
     */
    public void userLeavesLibrary(Long memberId) {
        activeUsers.remove(memberId);

        Set<Long> waitingBooks = memberWaitingBooks.get(memberId);

        if (waitingBooks != null) {
            for (Long bookId : waitingBooks) {

                Lock lock = getBookLock(bookId);
                lock.lock();
                try {
                    // Remove from waiting queue
                    LinkedHashSet<Long> waitingQueue = bookWaitList.get(bookId);
                    if (waitingQueue != null) {
                        waitingQueue.remove(memberId);
                        if (waitingQueue.isEmpty()) bookWaitList.remove(bookId);
                    }

                    // Remove from notifications
                    LinkedHashSet<Long> notifiedMembers = bookNotificationMembers.get(bookId);
                    if (notifiedMembers != null) {
                        boolean removed = notifiedMembers.remove(memberId);

                        // If removed, refill notifications
                        if (removed) refillNotifications(bookId);
                        if (notifiedMembers.isEmpty()) bookNotificationMembers.remove(bookId);
                    }
                } finally {
                    lock.unlock();
                }
            }

            memberWaitingBooks.remove(memberId);
        }

        removeDurationTrackerByMemberId(memberId);
    }


    /**
     * Creates and saves a ReadingActivity and decreases book copies.
     */
    @Transactional
    private void startReadingActivity(Member member, Book book, Duration duration) {
        ReadingActivity activity = new ReadingActivity(
                book,
                member,
                LocalDateTime.now(),
                LocalDateTime.now().plus(duration)
        );

        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);
        readingActivityRepository.save(activity);
    }


    /**
     * When a member requests a book:
     * 1. If available → assign immediately.
     * 2. If not available → place in waiting queue.
     * 3. Compute the queue rank.
     */
    @Transactional
    public BookBorrowResponse requestBook(Long memberId, Long bookId, int duration) {

        // Member must be inside library
        if (!activeUsers.contains(memberId)) {
            return new BookBorrowResponse(false, "User not in library");
        }

        // Member already borrowed the book
        if (readingActivityRepository.existsByMemberIdAndBookIdAndIsActiveTrue(memberId, bookId)) {
            return new BookBorrowResponse(true, "You have already borrowed the book");
        }

        Book book = bookRepository.findById(bookId).orElseThrow();
        Member member = memberRepository.findById(memberId).orElseThrow();

        Lock lock = getBookLock(bookId);
        lock.lock();
        try {
            LinkedHashSet<Long> waitingQueue =
                    bookWaitList.computeIfAbsent(bookId, k -> new LinkedHashSet<>());

            Long firstInQueue = waitingQueue.isEmpty() ? null : waitingQueue.iterator().next();
            String message = "";

            // If another user is first in queue
            if (firstInQueue != null && !firstInQueue.equals(memberId)) {
                message = "Someone else requested this book first, you'll get your turn soon!";
            }
            // If user is first OR queue empty AND book available
            else if (book.getAvailableCopies() > 0) {
                // Remove from queue if present
                waitingQueue.remove(memberId);
                updateMemberWaitingBooks(memberId, bookId, false);

                durationTracker.remove(new BookMemberDTO(bookId, memberId));

                // Assign the book
                startReadingActivity(member, book, Duration.ofHours(duration));
                return new BookBorrowResponse(true,
                        "Book " + book.getTitle() + " assigned successfully to " + member.getName());
            }

            // Otherwise: book unavailable → add to waiting list
            if (!waitingQueue.contains(memberId)) {
                waitingQueue.add(memberId);
                updateMemberWaitingBooks(memberId, bookId, true);
            }

            durationTracker.put(new BookMemberDTO(bookId, memberId), duration);

            // Calculate rank in queue
            long rank = 1;
            for (Long id : waitingQueue) {
                if (id.equals(memberId)) break;
                rank++;
            }

            // Update admin notifications
            refillNotifications(bookId);

            return new BookBorrowResponse(
                    false,
                    "Book not available. " + message + " You are in waiting list.",
                    rank
            );
        } finally {
            lock.unlock();
        }
    }


    // Helper to refresh notifications with locking
    private void checkWaitingQueue(Long bookId) {
        Lock lock = getBookLock(bookId);
        lock.lock();
        try {
            refillNotifications(bookId);
        } finally {
            lock.unlock();
        }
    }


    /**
     * Return a book:
     * - Marks reading activity inactive
     * - Increases available copies
     * - Triggers new notifications for waiting users
     */
    @Transactional
    public void returnBook(Long readingActivityId) {
        ReadingActivity activity = readingActivityRepository.findById(readingActivityId).orElse(null);

        if (activity != null && activity.getActive()) {
            activity.setActive(false);
            readingActivityRepository.save(activity);

            Book book = activity.getBook();
            book.setAvailableCopies(book.getAvailableCopies() + 1);
            bookRepository.save(book);

            // Notify next eligible readers
            checkWaitingQueue(book.getId());
        }
    }


    /**
     * Admin approves next reader manually.
     * This assigns the book to a specific member from the queue.
     */
    @Transactional
    public BookBorrowResponse approveNextReader(Long bookId, Long memberId) {

        Lock lock = getBookLock(bookId);
        lock.lock();

        try {
            LinkedHashSet<Long> waitingQueue = bookWaitList.get(bookId);
            Book book = bookRepository.findById(bookId).orElseThrow();

            if (waitingQueue != null && !waitingQueue.isEmpty()) {

                // Must be active and in queue
                if (waitingQueue.contains(memberId) && activeUsers.contains(memberId)) {

                    Member member = memberRepository.findById(memberId).orElseThrow();

                    // Only assign if available
                    if (book.getAvailableCopies() > 0) {

                        long duration = durationTracker.getOrDefault(
                                new BookMemberDTO(bookId, memberId), 1);

                        startReadingActivity(member, book, Duration.ofHours(duration));

                        waitingQueue.remove(memberId);
                        updateMemberWaitingBooks(memberId, bookId, false);

                        // Remove from notification list
                        LinkedHashSet<Long> notifiedMembers = bookNotificationMembers.get(bookId);
                        if (notifiedMembers != null) notifiedMembers.remove(memberId);

                        durationTracker.remove(new BookMemberDTO(bookId, memberId));

                        // If no copies left, clear notifications
                        if (book.getAvailableCopies() == 0) {
                            bookNotificationMembers.remove(bookId);
                        } else {
                            refillNotifications(bookId);
                        }

                        if (waitingQueue.isEmpty()) bookWaitList.remove(bookId);

                        return new BookBorrowResponse(true,
                                "Book " + book.getTitle() + " assigned successfully to " + member.getName());
                    }
                }
            }

            return new BookBorrowResponse(false,
                    "No available candidates for the Book " + book.getTitle());
        } finally {
            lock.unlock();
        }
    }


    /**
     * Returns the list of admin notifications.
     * Always limited to NOTIFY_LIMIT per book.
     */
    public List<Notification> getAdminNotifications() {
        List<Notification> notifications = new ArrayList<>();

        for (Map.Entry<Long, LinkedHashSet<Long>> entry : bookNotificationMembers.entrySet()) {

            Long bookId = entry.getKey();
            Book book = bookRepository.findById(bookId).orElse(null);
            if (book == null) continue;

            LinkedHashSet<Long> notifiedMembers = entry.getValue();

            for (Long memberId : notifiedMembers) {
                Member member = memberRepository.findById(memberId).orElse(null);

                if (member != null && activeUsers.contains(memberId)) {
                    notifications.add(new Notification(
                            book,
                            member,
                            durationTracker.getOrDefault(new BookMemberDTO(bookId, memberId), 1)
                    ));
                }
            }
        }

        return notifications;
    }

}
