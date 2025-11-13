// src/services/MemberService.ts
import axios from "axios";
import { MemberResponse } from "@/models/Member";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_HOST || "http://localhost:9090";

export const MemberService = {
  
  searchMembersByTitle: async (name: string, page: number, size: number): Promise<MemberResponse> => {
    const response = await axios.get(`${API_URL}/member`, {
      params: { name, page, size },
    });
    console.log(response.data)
    return response.data;
  },
};
