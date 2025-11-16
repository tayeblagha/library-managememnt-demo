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

    // Improved thread-safe data structures
    private final Set<Long> activeUsers = ConcurrentHashMap.newKeySet();

    // BookId -> Ordered set of waiting members (maintains order with O(1) operations)
    private final Map<Long, LinkedHashSet<Long>> bookWaitingQueues = new ConcurrentHashMap<>();

    // Track durations for waiting members
    private final Map<BookMemberDTO, Duration> durationTracker = new ConcurrentHashMap<>();

    // Efficient notification tracking - BookId -> Ordered Set (LinkedHashSet) of notified member IDs
    private final Map<Long, LinkedHashSet<Long>> bookNotificationMembers = new ConcurrentHashMap<>();

    // Additional structure for quick member->books lookup
    private final Map<Long, Set<Long>> memberWaitingBooks = new ConcurrentHashMap<>();

    // Locks for fine-grained synchronization
    private final Map<Long, Lock> bookLocks = new ConcurrentHashMap<>();

    @PostConstruct
    public void initializeActiveMembers() {
        System.out.println("🚀 Initializing active members on first run...");
        List<Member> activeMembers = memberRepository.findByActiveTrue();
        for (Member m : activeMembers) {
            activeUsers.add(m.getId());
        }
        System.out.println("Active users initialized: " + activeUsers);
    }

    private Lock getBookLock(Long bookId) {
        return bookLocks.computeIfAbsent(bookId, k -> new ReentrantLock());
    }

    public void removeDurationTrackerByMemberId(Long memberId) {
        // Remove all duration entries for this member
        durationTracker.keySet().removeIf(key -> key.getMemberId().equals(memberId));
    }

    @Scheduled(cron = "0 0 20 * * *")
    public void resetLibraryMemory() {
        System.out.println("🕗 Clearing in-memory data for new day... " + LocalDateTime.now());

        // Clear all in-memory data
        activeUsers.clear();
        bookWaitingQueues.clear();
        bookNotificationMembers.clear();
        memberWaitingBooks.clear();
        durationTracker.clear();
        bookLocks.clear();

        // Update database
        List<Member> allMembers = memberRepository.findAll();
        for (Member m : allMembers) {
            m.setActive(false);
        }
        memberRepository.saveAll(allMembers);
    }

    // User enters library - O(1)
    public void userEntersLibrary(Long memberId) {
        activeUsers.add(memberId);
    }

    // User leaves library - O(B) where B = number of books user is waiting for
    public void userLeavesLibrary(Long memberId) {
        activeUsers.remove(memberId);

        // Remove from waiting queues for all books
        Set<Long> waitingBooks = memberWaitingBooks.get(memberId);
        if (waitingBooks != null) {
            for (Long bookId : waitingBooks) {
                Lock lock = getBookLock(bookId);
                lock.lock();
                try {
                    LinkedHashSet<Long> waitingQueue = bookWaitingQueues.get(bookId);
                    if (waitingQueue != null) {
                        waitingQueue.remove(memberId); // O(1)
                        if (waitingQueue.isEmpty()) {
                            bookWaitingQueues.remove(bookId);
                        }
                    }

                    // Remove from notifications
                    LinkedHashSet<Long> notifiedMembers = bookNotificationMembers.get(bookId);
                    if (notifiedMembers != null) {
                        boolean removed = notifiedMembers.remove(memberId); // O(1)
                        if (notifiedMembers.isEmpty()) {
                            bookNotificationMembers.remove(bookId);
                        } else if (removed) {
                            // If we removed a notified member, promote next candidate (while lock held)
                            refillNotificationsLocked(bookId);
                        }
                    }
                } finally {
                    lock.unlock();
                }
            }
            memberWaitingBooks.remove(memberId);
        }

        removeDurationTrackerByMemberId(memberId);
    }
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

    // Request book - O(1) for most operations
    @Transactional

    public BookBorrowResponse requestBook(Long memberId, Long bookId, Duration duration) {
        if (!activeUsers.contains(memberId)) {
            return new BookBorrowResponse(false, "User not in library");
        }

        if (readingActivityRepository.existsByMemberIdAndBookIdAndIsActiveTrue(memberId, bookId)) {
            return new BookBorrowResponse(true, "You have already borrowed the book");
        }

        Book book = bookRepository.findById(bookId).orElseThrow();
        Member member = memberRepository.findById(memberId).orElseThrow();

        Lock lock = getBookLock(bookId);
        lock.lock();
        try {
            LinkedHashSet<Long> waitingQueue = bookWaitingQueues.computeIfAbsent(bookId,
                    k -> new LinkedHashSet<>());

            Long firstInQueue = waitingQueue.isEmpty() ? null : waitingQueue.iterator().next();
            String message = "";

            // If someone else is first in queue
            if (firstInQueue != null && !firstInQueue.equals(memberId)) {
                message = "Someone else requested this book first, you'll get your turn soon!";
            }
            // If member is first in queue or no queue, and book is available
            else if (book.getAvailableCopies() > 0 ) {
                if (firstInQueue != null) {
                    waitingQueue.remove(memberId); // Remove from queue
                    updateMemberWaitingBooks(memberId, bookId, false);
                }

                durationTracker.remove(new BookMemberDTO(bookId, memberId));
                startReadingActivity(member, book, Objects.requireNonNullElse(duration, Duration.ofHours(1)));
                return new BookBorrowResponse(true,
                        "Book " + book.getTitle() + " assigned successfully to " + member.getName());
            }

            // No copies available: add to waiting list if not already present
            if (!waitingQueue.contains(memberId)) { // O(1)
                waitingQueue.add(memberId); // O(1)
                updateMemberWaitingBooks(memberId, bookId, true);
                durationTracker.put(new BookMemberDTO(bookId, memberId),
                        Objects.requireNonNullElse(duration, Duration.ofHours(1)));
            }

            // Compute rank - O(Q) but could be optimized further if needed
            long rank = getMemberQueuePosition(waitingQueue, memberId);

            return new BookBorrowResponse(false,
                    "Book not available. " + message + " You are in waiting list.",
                    rank);
        } finally {
            lock.unlock();
        }
    }

    // O(Q) - but only called when member joins queue
    private long getMemberQueuePosition(LinkedHashSet<Long> queue, Long memberId) {
        long position = 1;
        for (Long id : queue) {
            if (id.equals(memberId)) {
                return position;
            }
            position++;
        }
        return position;
    }

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

    // Public check waiting queue - locks then fills notifications
    private void checkWaitingQueue(Long bookId) {
        Lock lock = getBookLock(bookId);
        lock.lock();
        try {
            refillNotificationsLocked(bookId);
        } finally {
            lock.unlock();
        }
    }


    private void refillNotificationsLocked(Long bookId) {
        LinkedHashSet<Long> waitingQueue = bookWaitingQueues.get(bookId);
        if (waitingQueue == null || waitingQueue.isEmpty()) return;

        Book book = bookRepository.findById(bookId).orElse(null);
        if (book == null) return;

        // Get (or create) ordered set of notified members for this book
        LinkedHashSet<Long> notifiedMembers = bookNotificationMembers.computeIfAbsent(bookId,
                k -> new LinkedHashSet<>());

        // Remove any notified members that are no longer valid (inactive or removed from repo)
        // We must iterate on a copy to avoid concurrent modification while removing from original set.
        List<Long> toRemove = new ArrayList<>();
        for (Long notified : notifiedMembers) {
            if (!activeUsers.contains(notified) || !memberRepository.existsById(notified)) {
                toRemove.add(notified);
            }
        }
        for (Long r : toRemove) {
            notifiedMembers.remove(r);
            updateMemberWaitingBooks(r, bookId, false);
            removeDurationTrackerByMemberId(r);
        }

        // Compute remaining notifications allowed: available copies minus already-notified members.
        int remainingToNotify = book.getAvailableCopies() - notifiedMembers.size();
        if (remainingToNotify <= 0) {
            // nothing to do; if no notified members exist at all, remove the empty set
            if (notifiedMembers.isEmpty()) {
                bookNotificationMembers.remove(bookId);
            }
            return;
        }

        // Iterate waiting queue in order and add eligible members to notifiedMembers
        Iterator<Long> iterator = waitingQueue.iterator();
        while (iterator.hasNext() && remainingToNotify > 0) {
            Long memberId = iterator.next();

            // Remove inactive or non-existing members from the queue
            if (!activeUsers.contains(memberId) || !memberRepository.existsById(memberId)) {
                iterator.remove();
                updateMemberWaitingBooks(memberId, bookId, false);
                removeDurationTrackerByMemberId(memberId);
                continue;
            }

            // If already notified, skip counting them again
            if (notifiedMembers.contains(memberId)) {
                continue;
            }

            // Add to notifiedMembers (this is the "notify admin / notify user" action)
            notifiedMembers.add(memberId);
            remainingToNotify--;
        }

        // Clean up empty structures
        if (waitingQueue.isEmpty()) {
            bookWaitingQueues.remove(bookId);
        }
        if (notifiedMembers.isEmpty()) {
            bookNotificationMembers.remove(bookId);
        } else {
            // ensure we write back the possibly-updated notifiedMembers
            bookNotificationMembers.put(bookId, notifiedMembers);
        }
    }

    // Return book - O(1) for queue operations
    @Transactional
    public void returnBook(Long readingActivityId) {
        ReadingActivity activity = readingActivityRepository.findById(readingActivityId).orElse(null);
        if (activity != null && activity.getActive()) {
            activity.setActive(false);
            readingActivityRepository.save(activity);

            Book book = activity.getBook();
            book.setAvailableCopies(book.getAvailableCopies() + 1);
            bookRepository.save(book);

            // Check waiting queue and notify admin (only up to available copies)
            checkWaitingQueue(book.getId());
        }
    }

    // Admin approves next user - O(1) for queue operations
    @Transactional

    public BookBorrowResponse approveNextReader(Long bookId, Long memberId) {
        Lock lock = getBookLock(bookId);
        lock.lock();
        try {
            LinkedHashSet<Long> waitingQueue = bookWaitingQueues.get(bookId);
            Book book = bookRepository.findById(bookId).orElseThrow();

            if (waitingQueue != null && !waitingQueue.isEmpty()) {
                // Verify member is in queue and active
                if (waitingQueue.contains(memberId) && activeUsers.contains(memberId)) {
                    Member member = memberRepository.findById(memberId).orElseThrow();

                    if (book.getAvailableCopies() > 0) {
                        Duration duration = durationTracker.getOrDefault(
                                new BookMemberDTO(bookId, memberId), Duration.ofHours(1));

                        startReadingActivity(member, book, duration);

                        // Clean up all tracking for this member-book pair
                        waitingQueue.remove(memberId);
                        updateMemberWaitingBooks(memberId, bookId, false);

                        LinkedHashSet<Long> notifiedMembers = bookNotificationMembers.get(bookId);
                        if (notifiedMembers != null) {
                            boolean removed = notifiedMembers.remove(memberId);
                            if (notifiedMembers.isEmpty()) {
                                bookNotificationMembers.remove(bookId);
                            } else if (removed) {
                                // If we removed a notified member, promote next candidate (while lock held)
                                refillNotificationsLocked(bookId);
                            }
                        }

                        durationTracker.remove(new BookMemberDTO(bookId, memberId));

                        // Clean up empty queue
                        if (waitingQueue.isEmpty()) {
                            bookWaitingQueues.remove(bookId);
                        }

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

    // Get admin notifications - only up to available copies per book
    public List<Notification> getAdminNotifications() {
        List<Notification> notifications = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (Map.Entry<Long, LinkedHashSet<Long>> entry : bookNotificationMembers.entrySet()) {
            Long bookId = entry.getKey();
            Book book = bookRepository.findById(bookId).orElse(null);
            if (book == null) continue;

            LinkedHashSet<Long> notifiedSet = entry.getValue();
            int allowed = book.getAvailableCopies();
            int count = 0;

            for (Long memberId : notifiedSet) {
                if (count >= allowed) break;
                Member member = memberRepository.findById(memberId).orElse(null);
                if (member != null && activeUsers.contains(memberId)) {
                    notifications.add(new Notification(book, member, now));
                    count++;
                }
            }
        }

        return notifications;
    }

}
