package com.library.managment.dto;

import com.library.managment.model.Book;
import com.library.managment.model.Member;

import java.util.Objects;

public class BookMemberDTO {
    private Long bookId;
    private Long memberId;


    public BookMemberDTO() {
    }




    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BookMemberDTO that)) return false;
        return Objects.equals(bookId, that.bookId) &&
                Objects.equals(memberId, that.memberId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(bookId, memberId);
    }
    public BookMemberDTO(Long bookId, Long memberId) {
        this.bookId = bookId;
        this.memberId = memberId;
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


}
