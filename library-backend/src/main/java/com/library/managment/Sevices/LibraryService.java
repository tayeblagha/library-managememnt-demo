package com.library.managment.Sevices;

import com.library.managment.dto.BookBorrowResponse;
import com.library.managment.model.Book;
import com.library.managment.model.Member;
import com.library.managment.model.Notification;
import com.library.managment.model.ReadingActivity;
import com.library.managment.repository.BookRepository;
import com.library.managment.repository.MemberRepository;
import com.library.managment.repository.ReadingActivityRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class LibraryService {

    // In-memory storage for quick access
    private final Set<Long> activeUsers = new HashSet<>();
    private final Map<Long, Queue<Long>> bookWaitingQueues = new HashMap<>(); // bookId -> queue of memberIds
    private final Queue<Notification> adminNotifications = new LinkedList<>();

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ReadingActivityRepository readingActivityRepository;


    @PostConstruct
    public void initializeActiveMembers() {
        System.out.println("🚀 Initializing active members on first run...");
        List<Member> activeMembers = memberRepository.findByActiveTrue();
        for (Member m : activeMembers) {
            activeUsers.add(m.getId());
        }
        System.out.println(activeUsers);
    }

    public Set<Long> getActiveUsers() {
        return activeUsers;
    }


    // do not forget to add @enablesceduling in main
    @Scheduled(cron = "0 0 20 * * *") // second, minute, hour, day, month, day-of-week
    public void resetLibraryMemory() {
        System.out.println("🕗 Clearing in-memory data for new day... " + LocalDateTime.now());
        activeUsers.clear();
        bookWaitingQueues.clear();
        adminNotifications.clear();
        // update db
        for (Member m : memberRepository.findAll()) {
            m.setActive(false);
            memberRepository.save(m);
        }
    }


    // User enters library
    public void userEntersLibrary(Long memberId) {
        activeUsers.add(memberId);
    }

    // User leaves library
    public void userLeavesLibrary(Long memberId) {
        activeUsers.remove(memberId);

        // Remove from all waiting queues
        for (Queue<Long> queue : bookWaitingQueues.values()) {
            queue.remove(memberId);
        }

        // Update admin notifications
        updateAdminNotifications();
    }

    private void startReadingActivity(Member member, Book book) {
        ReadingActivity activity = new ReadingActivity(book, member, LocalDateTime.now()
                , LocalDateTime.now().plusHours(4));
        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);
        readingActivityRepository.save(activity);

    }

    // Request to read a book
    public BookBorrowResponse requestBook(Long memberId, Long bookId) {
        // quick prechecks
        if (!activeUsers.contains(memberId)) {
            return new BookBorrowResponse(false, "User not in library");
        }
        if (readingActivityRepository.existsByMemberIdAndBookIdAndIsActiveTrue(memberId, bookId)) {
            return new BookBorrowResponse(true, "You have already borrowed the book");
        }

        // load entities (throw meaningful exceptions if not found)
        Book book = bookRepository.findById(bookId)
                .orElseThrow();
        Member member = memberRepository.findById(memberId)
                .orElseThrow();

        // ensure a thread-safe queue exists for this book
        Queue<Long> queue = bookWaitingQueues.computeIfAbsent(bookId, k -> new LinkedList<>());
        Long head = queue.peek();
        String message = "";
        if (head != null && !Objects.equals(head, memberId)) {
            message = "Someone else requested this book first, you'll get your turn soon!";
        } else if (book.getAvailableCopies() > 0 && (Objects.equals(head, memberId) || queue.isEmpty())) {

            queue.poll();
            startReadingActivity(member, book);
            return new BookBorrowResponse(true,
                    "Book " + book.getTitle() + " assigned successfully to " + member.getName());

        }

        // CASE 2 — no copies available: add to waiting list if not already present
        if (!queue.contains(memberId)) {
            queue.add(memberId);
        }
        // Find user rank in queue
        long rank = 1;
        boolean exists = false;

        for (Long id : queue) {
            if (id.equals(memberId)) {
                exists = true;
                break;   // we found the member → stop early
            }
            rank++;
        }

        if (!exists) {
            queue.add(memberId);
            rank = queue.size();  // member added to the end
        }

        return new BookBorrowResponse(false,
                "Book not available." + message + "You are in waiting list.",
                rank);
    }

    // Return book
    public void returnBook(Long readingActivityId) {
        ReadingActivity activity = readingActivityRepository.findById(readingActivityId).orElse(null);
        if (activity != null && activity.getActive()) {
            activity.setActive(false);
            readingActivityRepository.save(activity);

            Book book = activity.getBook();
            book.setAvailableCopies(book.getAvailableCopies() + 1);
            bookRepository.save(book);

            // Check waiting queue and notify admin
            checkWaitingQueue(book.getId());
        }
    }


    private void checkWaitingQueue(Long bookId) {
        Queue<Long> queue = bookWaitingQueues.get(bookId);
        if (queue != null && !queue.isEmpty()) {
            Long nextMemberId = queue.peek(); // Don't remove until admin confirms

            if (activeUsers.contains(nextMemberId)) {
                // Create notification for admin
                Book b = bookRepository.findById(bookId).orElseThrow();
                Member m = memberRepository.findById(nextMemberId).orElseThrow();
                Notification notification = new Notification(b, m, LocalDateTime.now());
                adminNotifications.add(notification);
            } else {
                queue.poll(); // Remove inactive user
                checkWaitingQueue(bookId); // Check next in queue
            }
        }
    }


    private void updateAdminNotifications() {
        // Remove notifications for users who left

        // safe removal during iteration
        adminNotifications.removeIf(notification ->
                !activeUsers.contains(notification.getMember().getId()));

    }

    // Admin approves next user
    public BookBorrowResponse approveNextReader(Long bookId) {
        Queue<Long> queue = bookWaitingQueues.get(bookId);
        Book book = bookRepository.findById(bookId).orElseThrow();
        if (queue != null && !queue.isEmpty()) {
            Long memberId = queue.poll();
            if (activeUsers.contains(memberId)) {

                Member member = memberRepository.findById(memberId).orElseThrow();
                if (book.getAvailableCopies() > 0) {
                    startReadingActivity(member, book);
                    adminNotifications.removeIf(n -> Objects.equals(n.getBook().getId(), bookId));

                    return new BookBorrowResponse(true,
                            "Book " + book.getTitle() + " assigned successfully to " + member.getName());
                }
            }
        }
        return new BookBorrowResponse(false,
                "No available candidates for the Book " + book.getTitle());


    }

    public Queue<Notification> getAdminNotifications() {
        return new LinkedList<>(adminNotifications);
    }
}
