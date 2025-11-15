package com.library.managment.repository;

import com.library.managment.model.ReadingActivity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ReadingActivityRepository extends JpaRepository<ReadingActivity, Long> {
    List<ReadingActivity> findByBookIdAndIsActiveTrue(Long bookId);
    List<ReadingActivity> findByMemberIdAndIsActiveTrue(Long memberId);
    boolean existsByMemberIdAndBookIdAndIsActiveTrue(Long memberId, Long bookId);


    List<ReadingActivity> findByIsActiveTrueAndExpectedEndTimeBefore(LocalDateTime now);

}
