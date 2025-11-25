// src/components/MemberList.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Member } from "../../models/Member"; 
import { MemberService } from "../../services/MemberService"; 
import MemberCard from "./MemberCard"; 
import useDelayedSpinner from "@/hooks/useDelayedSpinner";
import Spinner from "../spinner/Spinner";

export default function MemberList() { 
  const [members, setMembers] = useState<Member[]>([]); 
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  //  ADD THIS - showActiveOnly filter
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const pageSize = 9;

  // use the hook: only show spinner for append (page > 0)
  const isAppend = currentPage > 0;
  const showSpinner = useDelayedSpinner(isLoading, isAppend);

  const loadMembers = useCallback( 
    async (append = false) => {
      if (isLoadingRef.current) return;

      setIsLoading(true);
      isLoadingRef.current = true;

      try {
        // Apply an artificial delay for append loads so the spinner behavior is visible.
        const delayPromise = append
          ? new Promise((r) => setTimeout(r, 1500))
          : Promise.resolve();

        const [response] = await Promise.all([
          // DIFFERENT: Service call with active filter logic
          showActiveOnly
            ? MemberService.searchActiveMembersByName(searchTerm, currentPage, pageSize)
            : MemberService.searchMembersByName(searchTerm, currentPage, pageSize),
          delayPromise,
        ]);

        const newMembers = Array.isArray(response?.content) 
          ? response.content
          : [];
        setMembers((prev) => (append ? [...prev, ...newMembers] : newMembers)); 
        setHasMore(response?.last === false);
      } catch (error) {
        console.error("Error loading members:", error);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [searchTerm, currentPage, pageSize, showActiveOnly] // DIFFERENT: Added showActiveOnly dependency
  );

  // initial search / when searchTerm changes: load fresh (no spinner)
  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    loadMembers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, showActiveOnly]); // DIFFERENT: Added showActiveOnly dependency

  // scroll listener => increment page
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingRef.current || !hasMore) return;

      const position = window.scrollY + window.innerHeight;
      const height = document.documentElement.scrollHeight;
      if (position >= height - 100) {
        setCurrentPage((prev) => prev + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore]);

  // when page increases, load more (append)
  useEffect(() => {
    if (currentPage > 0) {
      loadMembers(true);
    }
  }, [currentPage, loadMembers]);

  // DIFFERENT: ADD THIS - Toggle handler for active status
  const handleToggle = async (id: number) => {
    try {
      const updated = await MemberService.toggleActive(id);

      setMembers((prev) => {
        const updatedList = prev.map((m) =>
          m.id === id ? { ...m, active: updated.active } : m
        );
        // If we're showing only active members and one becomes inactive, remove it from the list
        if (showActiveOnly && !updated.active) {
          return updatedList.filter((m) => m.id !== id);
        }
        return updatedList;
      });
    } catch (error) {
      console.error("Error toggling member:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="max-w-md mx-auto relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
              setHasMore(true);
            }}
            placeholder="Search members by name..." 
            className="w-full px-4 py-3 pl-12 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-4">
            <i className="fas fa-search text-gray-400"></i>
          </div>
        </div>
      </div>

      {/* DIFFERENT: ADD THIS - Active Only Toggle Button */}
      <div className="mb-8 flex justify-end">
            <button
          onClick={() => { setCurrentPage(0);
            setShowActiveOnly((prev) => !prev);
            // ✅ no manual reload — handled by useEffect above
          }}
          className={`px-4 py-3 rounded-lg font-medium text-sm transition-all duration-300 cursor-pointer border ${
            showActiveOnly
              ? "bg-green-500 hover:bg-green-600 text-white border-green-600"
              : "bg-gray-200 hover:bg-gray-300 text-gray-800 border-gray-300"
          }`}
        >
          <i className="fa fa-users" aria-hidden="true"></i>
          <i className="fa-solid fa-circle"></i>
        </button>
      </div>

      {/* Members Grid */} 
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {(members ?? []).map((member) => ( 
          <MemberCard key={member.id} member={member} onToggle={handleToggle} /> // DIFFERENT: MemberCard with onToggle
        ))}
      </div>

      {/* Loading Spinner (only when showSpinner is true) */}
      {showSpinner && (
        <div className="text-center py-8">
          <Spinner size={32} message="Loading more members..." /> 
        </div>
      )}

      {/* No More Members */} {/* DIFFERENT: Text */}
      {!hasMore && members.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          No more members to load
        </div>
      )}

      {/* Empty State */}
      {!isLoading && members.length === 0 && (
        <div className="text-center py-12 text-gray-500 text-lg">
          No members found {/* DIFFERENT: Text */}
        </div>
      )}
    </div>
  );
}