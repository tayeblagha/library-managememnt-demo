package com.library.managment.dto;

import com.fasterxml.jackson.annotation.JsonInclude;


@JsonInclude(JsonInclude.Include.NON_NULL) // Only include non-null fields in JSON
public class BookBorrowResponse {
    private boolean success;
    private String message;

    // Optional fields
    private Long rank; // use wrapper type Long instead of long

    public BookBorrowResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public BookBorrowResponse(boolean success, String message, Long rank) {
        this.success = success;
        this.message = message;
        this.rank = rank;
    }

    public Long getRank() {
        return rank;
    }

    public void setRank(Long rank) {
        this.rank = rank;
    }


    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }
}
