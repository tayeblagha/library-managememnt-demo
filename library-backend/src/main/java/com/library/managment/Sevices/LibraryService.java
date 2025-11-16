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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class LibraryService {

    @Autowired
    private BookRepository bookRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private ReadingActivityRepository readingActivityRepository;

    // In-memory storage for quick access
    private final Set<Long> activeUsers = new HashSet<>();
    private final Map<Long, Queue<Long>> bookWaitingQueues = new HashMap<>(); // bookId -> queue of memberIds
    private  final Map<BookMemberDTO,Duration> durationTracker = new HashMap<>();
    private final Queue<Notification> adminNotifications = new LinkedList<>();




    @PostConstruct
    public void initializeActiveMembers() {
        System.out.println("🚀 Initializing active members on first run...");
        List<Member> activeMembers = memberRepository.findByActiveTrue();
        for (Member m : activeMembers) {
            activeUsers.add(m.getId());
        }
        System.out.println(activeUsers);
    }

    public void removeDurationTrackerByMemberId(Long memberId) {
        durationTracker.keySet().removeIf(key -> key.getMemberId().equals(memberId));
    }


    // do not forget to add @enablesceduling in main
    @Scheduled(cron = "0 0 20 * * *") // second, minute, hour, day, month, day-of-week
    public void resetLibraryMemory() {
        System.out.println("🕗 Clearing in-memory data for new day... " + LocalDateTime.now());
        activeUsers.clear();
        bookWaitingQueues.clear();
        adminNotifications.clear();
        durationTracker.clear();
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
        removeDurationTrackerByMemberId(memberId);

        // Update admin notifications
        adminNotifications.removeIf(notification -> Objects.equals(notification.getMember().getId(), memberId));
    }

    private void startReadingActivity(Member member, Book book, Duration duration) {
        ReadingActivity activity = new ReadingActivity(book, member, LocalDateTime.now()
                , LocalDateTime.now().plus(duration));
        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);
        readingActivityRepository.save(activity);

    }

    public BookBorrowResponse requestBook(Long memberId, Long bookId, Duration duration) {
        if (!activeUsers.contains(memberId)) {
            return new BookBorrowResponse(false, "User not in library");
        }
        if (readingActivityRepository.existsByMemberIdAndBookIdAndIsActiveTrue(memberId, bookId)) {
            return new BookBorrowResponse(true, "You have already borrowed the book");
        }

        Book book = bookRepository.findById(bookId).orElseThrow();
        Member member = memberRepository.findById(memberId).orElseThrow();

        Queue<Long> queue = bookWaitingQueues.computeIfAbsent(bookId, k -> new LinkedList<>());
        Long head = queue.peek();
        String message = "";

        // If someone else is at head, tell them to wait
        if (head != null && !Objects.equals(head, memberId)) {
            message = "Someone else requested this book first, you'll get your turn soon!";
        } else if (book.getAvailableCopies() > 0 && (Objects.equals(head, memberId) || queue.isEmpty())) {
            // If member is head or no queue, assign immediately
            if (Objects.equals(head, memberId)) {
                queue.poll(); // remove head if it was them
            }
            // remove any stored duration for this key (we're assigning now)
            durationTracker.remove(new BookMemberDTO(bookId, memberId));
            startReadingActivity(member, book, Objects.requireNonNullElse(duration, Duration.ofHours(1)));
            return new BookBorrowResponse(true,
                    "Book " + book.getTitle() + " assigned successfully to " + member.getName());
        }

        // CASE 2 — no copies available: add to waiting list if not already present
        if (!queue.contains(memberId)) {
            queue.add(memberId);
            durationTracker.put(new BookMemberDTO(bookId, memberId),
                    Objects.requireNonNullElse(duration, Duration.ofHours(1)));
        }

        // compute rank
        long rank = 1;
        for (Long id : queue) {
            if (id.equals(memberId)) break;
            rank++;
        }

        return new BookBorrowResponse(false,
                "Book not available. " + message + " You are in waiting list.",
                rank);
    }

    private void checkWaitingQueue(Long bookId) {
        Queue<Long> queue = bookWaitingQueues.get(bookId);
        if (queue == null || queue.isEmpty()) return;

        // fetch book once and read how many copies are available
        Book book = bookRepository.findById(bookId).orElseThrow();
        int available = book.getAvailableCopies();
        if (available <= 0) return;

        // iterate safely so we can remove inactive entries
        Iterator<Long> iter = queue.iterator();
        while (iter.hasNext() && available > 0) {
            Long nextMemberId = iter.next();
            if (nextMemberId == null) continue;

            // remove inactive members from the queue
            if (!activeUsers.contains(nextMemberId)) {
                iter.remove();
                removeDurationTrackerByMemberId(nextMemberId);
                continue;
            }

            // ensure member still exists
            Member m = memberRepository.findById(nextMemberId).orElse(null);
            if (m == null) {
                iter.remove();
                removeDurationTrackerByMemberId(nextMemberId);
                continue;
            }

            // add admin notification if not already present
            boolean exists = adminNotifications.stream()
                    .anyMatch(n ->
                            n.getBook().getId().equals(bookId)
                                    && n.getMember().getId().equals(nextMemberId)
                    );

            if (!exists) {
                Notification notification = new Notification(book, m, LocalDateTime.now());
                adminNotifications.add(notification);
                available--; // count this notification toward available copies
            }

            // do NOT remove the candidate from the queue here — admin will approve and remove them
        }
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







    // Admin approves next user
    public BookBorrowResponse approveNextReader(Long bookId,Long memberId ) {
        Queue<Long> queue = bookWaitingQueues.get(bookId);
        Book book = bookRepository.findById(bookId).orElseThrow();
        if (queue != null && !queue.isEmpty()) {

            if (queue.contains(memberId)  && activeUsers.contains(memberId)) {

                Member member = memberRepository.findById(memberId).orElseThrow();
                if (book.getAvailableCopies() > 0) {
                    startReadingActivity(member, book,durationTracker.get(new BookMemberDTO(bookId,memberId)));
                    queue.removeIf(id-> Objects.equals(id,memberId));
                    adminNotifications.removeIf(n ->
                            (Objects.equals(n.getBook().getId(), bookId)
                                    && Objects.equals(n.getMember().getId(),memberId ) ));
                    durationTracker.remove(new BookMemberDTO(bookId,memberId));

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
