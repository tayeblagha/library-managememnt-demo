

import { Book } from "@/models/Book";
import { BookBorrowResponse } from "@/models/BookBorrowResponse";
import { Member } from "@/models/Member";
import { ReadingActivity } from "@/models/ReadingActivity";
import { NotificationDTO } from "@/models/NotificationDTO";
import axios from "axios";


const API_URL = process.env.NEXT_PUBLIC_BACKEND_HOST  +"/library";



const LibraryService = {
/**
* Get admin notifications (notifications that a book has a waiting candidate who is active)
* Expected return: NotificationDTO[]
* Endpoint - change if your backend uses a different path
*/
async getAdminNotifications(): Promise<NotificationDTO[]> {
const res = await axios.get(`${API_URL}/notifications`);
return res.data;
},


/**
* Approve the next reader for a given bookId. The backend should handle picking/polling the queue
* Expected return: { success: boolean, message: string, rank?: number }
*/
async approveNextReader(bookId: number,memberId:number):Promise<BookBorrowResponse> {
const res = await axios.post(`${API_URL}/approve/${bookId}/${memberId}`);
return res.data;
},


/**
* Optional: get expired books list (backend endpoint optional). If your backend doesn't expose this,
* the component falls back to marking old notifications as expired client-side.
*/
async getExpiredBooks(): Promise<ReadingActivity[]> {
const res = await axios.get(`${API_URL}/expired`);
return res.data;
},
};


export default LibraryService;