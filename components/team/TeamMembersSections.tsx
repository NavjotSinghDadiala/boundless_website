"use client";

import { useEffect, useState } from "react";
import New from "@/components/New";
import CouncilSection from "@/components/CouncilSection";

export default function TeamMembersSections() {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    let active = true;

    async function fetchTeamMembers() {
      try {
        const res = await fetch("/api/team-members");
        if (res.ok && active) {
          const data = await res.json();
          setMembers(Array.isArray(data.members) ? data.members : []);
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
      }
    }

    fetchTeamMembers();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <New members={members} />
      <CouncilSection members={members} />
    </>
  );
}
