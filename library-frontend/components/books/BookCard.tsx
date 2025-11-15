// src/components/BookCard.tsx
import { Book } from "@/models/Book";

interface Props {
  book: Book;
}

export default function BookCard({ book }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-[1000px] flex flex-col">
      <div className="h-[900px] overflow-hidden">
        <img
          src={
            book.imageUrl ||
            "https://via.placeholder.com/750x1000?text=No+Image"
          }
          alt={book.title}
          className="w-full h-full object-cover block"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-center text-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">
            {book.title}
          </h3>
          <p className="text-gray-600 text-sm mb-2">By {book.author}</p>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Total: {book.totalCopies}</span>
            <span
              className={
                book.availableCopies > 0
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              Available: {book.availableCopies}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
