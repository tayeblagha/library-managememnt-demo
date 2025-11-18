// src/components/MemberCard.tsx
"use client";

import { useState } from "react";
import { Member } from "@/models/Member";
import dynamic from "next/dynamic";

interface Props {
  member: Member; 
  onToggle: (id: number, currentActive: boolean) => void; // DIFFERENCE: added onToggle
}

// DIFFERENCE: Add MemberBookManager popup
const MemberBookManager = dynamic(() => import("./MemberBookManager"), {
  ssr: false,
});

export default function MemberCard({ member, onToggle }: Props) {
  const [openPopup, setOpenPopup] = useState(false);

  return (
    <>
      {/* Card - DIFFERENCE: added cursor-pointer and onClick */}
      <div
        className="rounded-2xl h-[750px] flex flex-col cursor-pointer bg-white overflow-hidden shadow-lg border border-gray-200" // DIFFERENCE: different height and bg-white
        onClick={() => setOpenPopup(true)}
      >
        <div className="h-[650px] overflow-hidden"> {/* DIFFERENCE: different height */}
          <img
            src={member.imageUrl} 
            alt={member.name} // DIFFERENCE: name instead of title
            className="w-full h-full object-cover block"
          />
        </div>

        <div className="p-4 flex flex-col grow">
          <div className="flex justify-between items-center text-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">
              {member.name} {/* DIFFERENCE: name instead of title */}
            </h3>
            {/* DIFFERENCE: No author field */}
          </div>

          <div className="mt-auto">
            {/* DIFFERENCE: Toggle button instead of copies info */}
            <div className="flex justify-between items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
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
        </div>
      </div>

      {/* DIFFERENCE: Add MemberBookManager popup */}
      {openPopup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpenPopup(false)}
        >
          <div
            className="bg-white p-4 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <MemberBookManager memberId={member.id} />
          </div>
        </div>
      )}
    </>
  );
}