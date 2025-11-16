package com.library.managment.controllers;


import com.library.managment.Sevices.LibraryService;
import com.library.managment.dto.BookBorrowResponse;
import com.library.managment.model.Book;
import com.library.managment.model.Member;
import com.library.managment.model.ReadingActivity;
import com.library.managment.repository.BookRepository;
import com.library.managment.repository.MemberRepository;
import com.library.managment.repository.ReadingActivityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/member")
@CrossOrigin(origins = "${SPRING_ORIGINS:*}")

public class MemberController {

    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private BookRepository bookRepository;
    @Autowired
    private ReadingActivityRepository readingActivityRepository;
    @Autowired
    private LibraryService libraryService;
    public static final String BASE_URL = "https://raw.githubusercontent.com/smoothcoode/Image/refs/heads/main/members/";

    // Get all members
    @GetMapping
    public Page<Member> getAllMembersPageable(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String name) {
        Pageable pageable = PageRequest.of(page, size);

        if (name != null && !name.trim().isEmpty()) {
            return memberRepository.findByNameContainingIgnoreCase(name, pageable);
        } else {
            return memberRepository.findAll(pageable);
        }
    }


    // Get all members
    @GetMapping("/active")
    public Page<Member> getAllActiveMembersPageable(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String name) {
        Pageable pageable = PageRequest.of(page, size);

        if (name != null && !name.trim().isEmpty()) {
            return memberRepository.findByNameContainingIgnoreCaseAndActiveTrue(name, pageable);
        } else {
            return memberRepository.findByActiveTrue(pageable);
        }
    }

    // Get member by id
    @GetMapping("/{id}")
    public ResponseEntity<Member> getMemberById(@PathVariable Long id) {
        Optional<Member> member = memberRepository.findById(id);
        return member.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Member initializeMember(Member member) {
        // Prepend BASE_URL to image URL
        member.setImageUrl(BASE_URL + member.getImageUrl());

        return member;
    }

    // Add new member
    @PostMapping
    public Member createMember(@RequestBody Member member) {

        Member m = memberRepository.save(initializeMember(member));
        libraryService.userEntersLibrary(m.getId());
        return m;
    }

    @PostMapping("/batch")
    public List<Member> createMembers(@RequestBody List<Member> members) {
        // Initialize each member in the list
        for (Member member : members) {
            initializeMember(member);
        }
        List<Member> savedMembers = memberRepository.saveAll(members);
        for (Member m : savedMembers) libraryService.userEntersLibrary(m.getId());
        return savedMembers;
    }

    // Update existing member
    @PutMapping("/{id}")
    public ResponseEntity<Member> updateMember(@PathVariable Long id, @RequestBody Member memberDetails) {
        Optional<Member> optionalMember = memberRepository.findById(id);

        if (optionalMember.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Member member = optionalMember.get();
        member.setName(memberDetails.getName());

        Member updatedMember = memberRepository.save(member);
        return ResponseEntity.ok(updatedMember);
    }

    // Delete member
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
        if (!memberRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        memberRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Member enters library
    @PostMapping("/toggle-active/{id}")
    public Member enterLibrary(@PathVariable Long id) {
        Member member = memberRepository.findById(id).orElseThrow();
        if (member.getActive()) {
            libraryService.userLeavesLibrary(id);
        } else {
            libraryService.userEntersLibrary(id);
        }
        member.setActive(!member.getActive());


        return memberRepository.save(member);
    }

    @GetMapping("borrowed/{memberId}")
    public List<ReadingActivity> getBorrowedBooks(@PathVariable Long memberId) {
        return readingActivityRepository
                .findByMemberIdAndIsActiveTrue(memberId);
    }


    @GetMapping("available/{memberId}")
    public List<Book> getAvailableBooks(@PathVariable Long memberId) {
        Set<Long> activeBookIds = readingActivityRepository
                .findByMemberIdAndIsActiveTrue(memberId)
                .stream()
                .map(ra -> ra.getBook().getId())
                .collect(Collectors.toSet());

        List<Book> availableBooks = new ArrayList<>();
        for (Book b : bookRepository.findAll()) {
            if (!activeBookIds.contains(b.getId())) availableBooks.add(b);
        }
        return availableBooks;
    }


    // Request a book
    @PostMapping("/read/{memberId}/{bookId}")
    public BookBorrowResponse readBook(@PathVariable Long memberId, @PathVariable Long bookId) {
        return libraryService.requestBook(memberId, bookId,Duration.ofHours(6));
    }
    // Request a book
    @PostMapping("/borrow/{memberId}/{bookId}")
    public BookBorrowResponse borrowBook(
            @PathVariable Long memberId,
            @PathVariable Long bookId,
            @RequestParam long duration) {

        return libraryService.requestBook(memberId, bookId, Duration.ofHours(duration));
    }


    // Return a book
    @PostMapping("/return/{activityId}")
    public BookBorrowResponse returnBook(@PathVariable Long activityId) {
        libraryService.returnBook(activityId);
        return new BookBorrowResponse(true, "book returned successfully");
    }


}
