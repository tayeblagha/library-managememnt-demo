package com.library.managment.controllers;

import com.library.managment.Sevices.LibraryService;
import com.library.managment.dto.BookBorrowResponse;
import com.library.managment.model.Notification;
import com.library.managment.model.ReadingActivity;
import com.library.managment.repository.ReadingActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Queue;

@RestController
@RequestMapping("/library")
@CrossOrigin(origins = "${SPRING_ORIGINS:*}")

public class LibraryController {

    @Autowired
    private LibraryService libraryService;
    @Autowired
    private ReadingActivityRepository readingActivityRepository;

    // Admin: view notifications
    @GetMapping("/notifications")
    public Queue<Notification> getNotifications() {
        return libraryService.getAdminNotifications();
    }


    // Approve next reader for a book
    @PostMapping("/approve/{bookId}/{memberId}")
    public BookBorrowResponse approveReader(@PathVariable Long bookId,@PathVariable Long memberId) {
       return  libraryService.approveNextReader(bookId,memberId);

    }



// show books not returned before deadline
@GetMapping("/expired")
public List<ReadingActivity> getExpiredActivities() {

    return readingActivityRepository.
            findByIsActiveTrueAndExpectedEndTimeBefore(LocalDateTime.now());
}


}


