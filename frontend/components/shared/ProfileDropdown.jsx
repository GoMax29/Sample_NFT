"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Subscribe from "./Subscribe";

const ProfileDropdown = ({ isRegistered, artistName, address, children }) => {
  const router = useRouter();
  const [showSubscribe, setShowSubscribe] = useState(false);

  const handleProfileClick = () => {
    if (isRegistered) {
      router.push("/account");
    } else {
      setShowSubscribe(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleProfileClick}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isRegistered && (
            <DropdownMenuItem
              onClick={() => router.push("/CreateNewCollection")}
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Collection
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Subscribe
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
        onSuccess={() => {
          setShowSubscribe(false);
          router.push("/account");
        }}
      />
    </>
  );
};

export default ProfileDropdown;
