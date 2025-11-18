// src/services/BookService.ts
import axios from "axios";
import { BookResponse } from "@/models/Book";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_HOST || "http://localhost:9090";

export const BookService = {
  
  searchBooksByTitle: async (title: string, page: number, size: number): Promise<BookResponse> => {
    const response = await axios.get(`${API_URL}/book/pageable`, {
      params: { title, page, size },
    });
    console.log(response.data)
    return response.data;
  },
};
