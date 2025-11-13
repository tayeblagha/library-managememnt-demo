package com.library.managment.controllers;

import com.library.managment.Sevices.LibraryService;
import com.library.managment.model.Notification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Queue;

@RestController
@RequestMapping("/library")
@CrossOrigin(origins = "${SPRING_ORIGINS:*}")

public class LibraryController {

    @Autowired
    private LibraryService libraryService;

    // Request a book
    @PostMapping("/request")
    public String requestBook(@RequestParam Long memberId, @RequestParam Long bookId) {
        return libraryService.requestBook(memberId, bookId);
    }

    // Return a book
    @PostMapping("/return/{activityId}")
    public String returnBook(@PathVariable Long activityId) {
        libraryService.returnBook(activityId);
        return "Book returned successfully.";
    }

    // Approve next reader for a book
    @PostMapping("/approve/{bookId}")
    public String approveReader(@PathVariable Long bookId) {
        libraryService.approveNextReader(bookId);
        return "Next reader approved.";
    }

    // Admin: view notifications
    @GetMapping("/notifications")
    public Queue<Notification> getNotifications() {
        return libraryService.getAdminNotifications();
    }
}

