// src/components/BookCard.tsx
import { Book } from "@/models/Book";

interface Props {
  book: Book;
}

export default function BookCard({ book }: Props) {
  return (
    <>
      {/* Main card container.
          h-[1000px] → fixed card height
          flex flex-col → stack content vertically
          overflow-hidden → hide anything that spills out
          rounded-2xl → smooth rounded corners
          shadow-lg → card shadow
          border border-gray-200 → light gray border */}
      <div className="h-[1000px] flex flex-col overflow-hidden rounded-2xl shadow-lg border border-gray-200">

        {/* Image wrapper.
            h-[900px] → allocate most of card height to image
            overflow-hidden → crop the image if it's too tall */}
        <div className="h-[900px] overflow-hidden">

          {/* Image itself.
              block → removes inline spacing
              w-full h-full → fill the wrapper size
              object-cover → crop image while keeping aspect ratio */}
          <img
            src={book.imageUrl}
            alt={book.title}
            className="block w-full h-full object-cover"
          />
        </div>

        {/* Content section under the image.
            flex flex-col → stack text vertically
            grow → fill any remaining card space
            p-4 → padding for spacing */}
        <div className="flex flex-col grow p-4">

          {/* Row for title + author.
              flex items-center justify-between → arrange items horizontally and space them apart
              text-sm → default small text size for row */}
          <div className="flex items-center justify-between text-sm">

            {/* Book title.
                text-lg → larger font
                font-semibold → slightly bold
                line-clamp-2 → limit to 2 lines with ellipsis
                mb-1 → small bottom margin
                text-gray-800 → dark gray text */}
            <h3 className="text-lg font-semibold line-clamp-2 mb-1 text-gray-800">
              {book.title}
            </h3>

            {/* Author name.
                text-sm → small text
                mb-2 → spacing below
                text-gray-600 → medium gray text */}
            <p className="text-sm mb-2 text-gray-600">By {book.author}</p>
          </div>

          {/* Push availability section to the bottom of the content area */}
          <div className="mt-auto">

            {/* Availability row.
                flex items-center justify-between → align text horizontally with spacing */}
            <div className="flex items-center justify-between text-sm">

              {/* Total copies text.
                  text-gray-700 → slightly dark gray */}
              <span className="text-sm text-gray-700">
                Total: {book.totalCopies}
              </span>

              {/* Available copies text.
                  font-medium → medium weight
                  text-green-600 or text-red-600 → color depends on availability */}
              <span
                className={
                  book.availableCopies > 0
                    ? "font-medium text-green-600"
                    : "font-medium text-red-600"
                }
              >
                Available: {book.availableCopies}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
