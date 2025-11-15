package com.library.managment.model;

import java.time.LocalDateTime;

public class Notification {
    private Book  book;
    private Member member;
    private LocalDateTime timestamp;

    public Notification(Book book, Member member, LocalDateTime timestamp) {
        this.book = book;
        this.member = member;
        this.timestamp = timestamp;
    }

    public Book getBook() {
        return book;
    }

    public void setBook(Book book) {
        this.book = book;
    }

    public Member getMember() {
        return member;
    }

    public void setMember(Member member) {
        this.member = member;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}