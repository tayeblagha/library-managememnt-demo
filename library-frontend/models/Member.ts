// src/models/Member.ts
export interface Member {
  id: number;
  name: string;
  imageUrl: string;
  active: boolean;
  

  
}

export interface MemberResponse {
  content: Member[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}


  