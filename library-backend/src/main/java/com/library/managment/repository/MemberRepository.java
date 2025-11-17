package com.library.managment.repository;

import com.library.managment.model.Book;
import com.library.managment.model.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Page<Member> findByNameContainingIgnoreCase(String name, Pageable pageable);
    Page<Member> findByNameContainingIgnoreCaseAndIsActiveTrue(String name, Pageable pageable);
    List<Member> findByIsActiveTrue();
    Page<Member> findByIsActiveTrue(Pageable pageable);




}

