// src/models/Book.ts
export interface Book {
  id: number;
  title: string;
  author: string;
  imageUrl: string;
  totalCopies: number;
  availableCopies: number;
}

export interface BookResponse {
  content: Book[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}
