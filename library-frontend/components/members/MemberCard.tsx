// src/components/MemberCard.tsx
import { Member } from "@/models/Member";

interface Props {
  member: Member;
}

export default function MemberCard({ member }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 h-[750px] flex flex-col">
      <div className="h-[650px] overflow-hidden">
        <img
          src={member.imageUrl || "https://via.placeholder.com/750x1000?text=No+Image"}
          alt={member.name}
          className="w-full h-full object-cover block"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-center text-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">{member.name}</h3>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Total: </span>
            <span className={"text-red-600 font-medium"}>
              Available:
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
