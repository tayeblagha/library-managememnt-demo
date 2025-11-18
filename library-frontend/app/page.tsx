// src/app/page.tsx
import BookList from "../components/books/BookList";

export default function Home() {
  return (
    <main className="min-h-screen  bg-gray-50 text-gray-800">
    
   <BookList/>
      
    </main>
  );
}