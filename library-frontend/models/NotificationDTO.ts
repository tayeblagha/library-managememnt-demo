import { Book } from "./Book";
import { Member } from "./Member";

export type NotificationDTO = {
id?: number;
book: Book;
member: Member;
duration: number; // number of hours
};