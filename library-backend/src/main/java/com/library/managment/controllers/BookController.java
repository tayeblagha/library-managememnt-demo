package com.library.managment.controllers;

import com.library.managment.model.Book;
import com.library.managment.model.ReadingActivity;
import com.library.managment.repository.BookRepository;
import com.library.managment.repository.ReadingActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/book")
@CrossOrigin(origins = "${SPRING_ORIGINS:*}")
public class BookController {

    // Ctrl + Alt + Shift + J     Select All Occurrences of a Word

    @Autowired
    private BookRepository bookRepository;

    public static final String BASE_URL = "https://raw.githubusercontent.com/smoothcoode/Image/refs/heads/main/books/";


    // Get all books

    @GetMapping
    public Page<Book> getAllBooksPageable(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String title) {

        Pageable pageable = PageRequest.of(page, size);

        if (title != null && !title.trim().isEmpty()) {
            return bookRepository.findByTitleContainingIgnoreCase(title, pageable);
        } else {
            return bookRepository.findAll(pageable);
        }
    }
    // Get book by id
    @GetMapping("/{id}")
    public ResponseEntity<Book> getBookById(@PathVariable Long id) {
        Optional<Book> book = bookRepository.findById(id);
        return book.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Add new book
    private Book initializeBook(Book book) {
        // If totalCopies is null, set both to 1
        if (book.getTotalCopies() == null) {
            book.setTotalCopies(1);
        }
        // Always match availableCopies to totalCopies
        book.setAvailableCopies(book.getTotalCopies());
        // Prepend BASE_URL to image URL
        book.setImageUrl(BASE_URL + book.getImageUrl());
        return book;
    }

    @PostMapping
    public Book createBook(@RequestBody Book book) {
        return bookRepository.save(initializeBook(book));
    }

    @PostMapping("/batch")
    public List<Book> createBooks(@RequestBody List<Book> books) {
        // Initialize each book in the list
        for (Book book : books){
            initializeBook(book);
        }
        return bookRepository.saveAll(books);
    }


    // Update existing book
    @PutMapping("/{id}")
    public ResponseEntity<Book> updateBook(@PathVariable Long id, @RequestBody Book bookDetails) {
        Optional<Book> optionalBook = bookRepository.findById(id);

        if (optionalBook.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Book book = optionalBook.get();
        book.setTitle(bookDetails.getTitle());
        book.setAuthor(bookDetails.getAuthor());
        book.setTotalCopies(bookDetails.getTotalCopies());
        book.setAvailableCopies(bookDetails.getAvailableCopies());

        Book updatedBook = bookRepository.save(book);
        return ResponseEntity.ok(updatedBook);
    }

    // Delete book
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable Long id) {
        if (!bookRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        bookRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }



}
