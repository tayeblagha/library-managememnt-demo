// src/components/MemberCard.tsx
"use client";

import { useState } from "react";
import { Member } from "@/models/Member";
import dynamic from "next/dynamic";

interface Props {
  member: Member;
  onToggle: (id: number, currentActive: boolean) => void;
}

// lazy load popup
const MemberBookManager = dynamic(() => import("./MemberBookManager"), {
  ssr: false,
});

export default function MemberCard({ member, onToggle }: Props) {
  const [openPopup, setOpenPopup] = useState(false);

  return (
    <>
      {/* Card */}
      <div
        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg 
                   transition-shadow duration-300 h-[750px] flex flex-col
                   cursor-pointer" // 👈 SHOW HAND ON HOVER
        onClick={() => setOpenPopup(true)} // 👈 OPEN POPUP WHEN CLICKED
      >
        <div className="h-[650px] overflow-hidden">
          <img
            src={
              member.imageUrl ||
              "https://via.placeholder.com/750x1000?text=No+Image"
            }
            alt={member.name}
            className="w-full h-full object-cover block"
          />
        </div>

        <div className="p-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">
            {member.name}
          </h3>

          {/* Toggle button should NOT open popup */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // 👈 prevent card click
              onToggle(member.id, member.active);
            }}
            className={`px-5 py-3 rounded-full font-medium text-sm transition-all duration-300 cursor-pointer ${
              member.active
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-300 hover:bg-gray-400 text-gray-800"
            }`}
          ></button>
        </div>
      </div>

      {/* Popup modal */}
      {openPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpenPopup(false)} // close when clicking outside
        >
          <div
            className="bg-white p-4 rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <MemberBookManager memberId={member.id} />
          </div>
        </div>
      )}
    </>
  );
}
