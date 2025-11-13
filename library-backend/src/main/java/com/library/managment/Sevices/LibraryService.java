package com.library.managment.Sevices;

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
        List<Member> activeMembers = memberRepository.findByIsActiveTrue();
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
        for (Member m: memberRepository.findAll()){
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

    // Request to read a book
    public String requestBook(Long memberId, Long bookId) {
        if (!activeUsers.contains(memberId)) {
            return "User not in library";
        }

        Book book = bookRepository.findById(bookId).orElseThrow();
        Member member = memberRepository.findById(memberId).orElseThrow();



        if (book.getAvailableCopies() > 0) {
            // Start reading immediately
            startReadingActivity(member, book);
            return "Book assigned successfully";
        } else {
            // Add to waiting queue
            bookWaitingQueues.putIfAbsent(bookId, new LinkedList<>());
            bookWaitingQueues.get(bookId).add(memberId);

            // Calculate earliest return time
            LocalDateTime earliestReturn = getEarliestReturnTime(bookId);
            return "Book not available. Earliest return: " + earliestReturn;
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

    private void startReadingActivity(Member member, Book book) {
        ReadingActivity activity = new ReadingActivity();
        activity.setMember(member);
        activity.setBook(book);
        activity.setStartTime(LocalDateTime.now());
        activity.setExpectedEndTime(LocalDateTime.now().plusHours(4));

        readingActivityRepository.save(activity);

        book.setAvailableCopies(book.getAvailableCopies() - 1);
        bookRepository.save(book);
    }

    private void checkWaitingQueue(Long bookId) {
        Queue<Long> queue = bookWaitingQueues.get(bookId);
        if (queue != null && !queue.isEmpty()) {
            Long nextMemberId = queue.peek(); // Don't remove until admin confirms

            if (activeUsers.contains(nextMemberId)) {
                // Create notification for admin
                Notification notification = new Notification(bookId, nextMemberId, LocalDateTime.now());
                adminNotifications.add(notification);
            } else {
                queue.poll(); // Remove inactive user
                checkWaitingQueue(bookId); // Check next in queue
            }
        }
    }

    private LocalDateTime getEarliestReturnTime(Long bookId) {
        List<ReadingActivity> activeReadings = readingActivityRepository
                .findByBookIdAndIsActiveTrue(bookId);

        return activeReadings.stream()
                .map(ReadingActivity::getExpectedEndTime)
                .min(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now().plusHours(2));
    }

    private void updateAdminNotifications() {
        // Remove notifications for users who left

        Iterator<Notification> iterator = adminNotifications.iterator();
        while (iterator.hasNext()) {
            Notification notification = iterator.next();
            if (!activeUsers.contains(notification.getMemberId())) {
                iterator.remove(); // safe removal during iteration
            }
        }

    }

    // Admin approves next user
    public void approveNextReader(Long bookId) {
        Queue<Long> queue = bookWaitingQueues.get(bookId);
        if (queue != null && !queue.isEmpty()) {
            Long memberId = queue.poll();
            if (activeUsers.contains(memberId)) {
                Book book = bookRepository.findById(bookId).orElse(null);
                Member member = memberRepository.findById(memberId).orElseThrow();
                if (book != null && book.getAvailableCopies() > 0) {
                    startReadingActivity(member, book);
                }
            }
        }
    }

    public Queue<Notification> getAdminNotifications() {
        return new LinkedList<>(adminNotifications);
    }
}
