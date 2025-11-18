package com.library.managment.model;


public class Notification {
    private Book  book;
    private Member member;
    private int duration;

    public Notification(Book book, Member member, int duration) {
        this.book = book;
        this.member = member;
        this.duration = duration;
    }

    public Member getMember() {
        return member;
    }

    public void setMember(Member member) {
        this.member = member;
    }

    public int getDuration() {
        return duration;
    }

    public void setDuration(int duration) {
        this.duration = duration;
    }

    public Book getBook() {
        return book;
    }

    public void setBook(Book book) {
        this.book = book;
    }
}