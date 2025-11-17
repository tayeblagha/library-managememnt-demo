// src/services/MemberService.ts
import axios from "axios";
import { Member, MemberResponse } from "@/models/Member";
import { Book } from "@/models/Book";
import { ReadingActivity } from "@/models/ReadingActivity";
import { BookBorrowResponse } from "@/models/BookBorrowResponse";


const API_URL = process.env.NEXT_PUBLIC_BACKEND_HOST  +"/member";

export const MemberService = {
  
  searchMembersByTitle: async (name: string, page: number, size: number): Promise<MemberResponse> => {
    const response = await axios.get(`${API_URL}/pageable`, {
      params: { name, page, size },
    });
    return response.data;
  },
  searchActiveMembersByTitle: async (name: string, page: number, size: number): Promise<MemberResponse> => {
    const response = await axios.get(`${API_URL}/pageable/active`, {
      params: { name, page, size },
    });
    return response.data;
  },
  getMemberById: async (id: number): Promise<Member> => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  },
  

  // optional convenience to toggle based on current state
  toggleActive: async (id: number, currentlyActive: boolean): Promise<Member> => {
      const response = await axios.post(`${API_URL}/toggle-active/${id}`);
    return response.data;
  },

 getAvailableBooks: async (id: number): Promise<Book[]> => {
  const response = await axios.get(`${API_URL}/available/${id}`);
  return response.data;
},
// Get borrowed books of member
getBorrowedBooks: async (memberId: number): Promise<ReadingActivity[]> => {
  const response = await axios.get(`${API_URL}/borrowed/${memberId}`);
  return response.data;
},

// Read a book (6 hours fixed)
readBook: async (memberId: number, bookId: number): Promise<BookBorrowResponse> => {
  const response = await axios.post(
    `${API_URL}/read/${memberId}/${bookId}`,
    null
  );
  return response.data;
},

borrowBook: async (memberId: number, bookId: number, duration: number): Promise<BookBorrowResponse> => {
  const response = await axios.post(
    `${API_URL}/borrow/${memberId}/${bookId}?duration=${duration}`
  );

  return response.data;
},



// Return book
returnBook: async (activityId: number): Promise<BookBorrowResponse> => {
  const response = await axios.post(`${API_URL}/return/${activityId}`);
  return response.data;
},





 
};
