package com.library.managment.model;

import java.time.LocalDateTime;

public class Notification {
    private Long bookId;
    private Long memberId;
    private LocalDateTime timestamp;

    public Notification(Long bookId, Long memberId, LocalDateTime timestamp) {
        this.bookId = bookId;
        this.memberId = memberId;
        this.timestamp = timestamp;
    }

    public Long getBookId() {
        return bookId;
    }

    public void setBookId(Long bookId) {
        this.bookId = bookId;
    }

    public Long getMemberId() {
        return memberId;
    }

    public void setMemberId(Long memberId) {
        this.memberId = memberId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}