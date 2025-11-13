package com.library.managment.controllers;


import com.library.managment.Sevices.LibraryService;
import com.library.managment.model.Member;
import com.library.managment.model.Member;
import com.library.managment.repository.MemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/member")
@CrossOrigin(origins = "${SPRING_ORIGINS:*}")

public class MemberController {

    @Autowired
    private MemberRepository memberRepository;
    @Autowired
    private LibraryService libraryService;
    public static final String BASE_URL = "https://raw.githubusercontent.com/smoothcoode/Image/refs/heads/main/members/";

    // Get all members
    @GetMapping
    public Page<Member> getAllMembersPageable(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String name)
    {
        Pageable pageable = PageRequest.of(page, size);

        if (name != null && !name.trim().isEmpty()) {
            return memberRepository.findByNameContainingIgnoreCase(name,pageable);
        } else {
            return memberRepository.findAll(pageable);
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
        return memberRepository.save(initializeMember(member));
    }

    @PostMapping("/batch")
    public List<Member> createMembers(@RequestBody List<Member> members) {
        // Initialize each member in the list
        for (Member member : members){
            initializeMember(member);
        }
        return memberRepository.saveAll(members);
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
    @PostMapping("/activate/{id}")
    public Member enterLibrary(@PathVariable Long id) {
        Member member = memberRepository.findById(id).orElseThrow();
        member.setActive(true);
        libraryService.userEntersLibrary(id);
        return memberRepository.save(member);
    }

    // Member leaves library
    @PostMapping("/deactivate/{id}")
    public Member leaveLibrary(@PathVariable Long id) {
        Member member = memberRepository.findById(id).orElseThrow();
        member.setActive(false);
        libraryService.userLeavesLibrary(id);
        return memberRepository.save(member) ;
    }



}
