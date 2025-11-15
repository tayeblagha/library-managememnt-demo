import { Book } from "./Book";
import { Member } from "./Member";

export interface ReadingActivity {
  id?: number;
  book: Book;
  member: Member;
  startTime: string;          // LocalDateTime → string ISO
  expectedEndTime: string;    // LocalDateTime → string ISO
  active: boolean;            // Boolean → boolean

    

}