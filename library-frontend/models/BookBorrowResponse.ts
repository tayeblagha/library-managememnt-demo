export interface BookBorrowResponse {
  success: boolean;
  message: string;
  rank?:number;
    expectedEndTime?:String;
}
