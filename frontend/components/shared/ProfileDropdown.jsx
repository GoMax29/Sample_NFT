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
import { useDisconnect } from "wagmi";

const ProfileDropdown = ({ children, isRegistered, artistName, address }) => {
  const { disconnect } = useDisconnect();
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [localArtistName, setLocalArtistName] = useState(artistName);
  const router = useRouter();

  const handleProfileClick = () => {
    if (isRegistered) {
      router.push("/account");
    } else {
      setShowSubscribe(true);
    }
  };

  const handleRegistrationSuccess = (name) => {
    setLocalArtistName(name);
    setShowSubscribe(false);
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {isRegistered ? (
            <>
              <DropdownMenuItem
                onClick={() => router.push("/account")}
                className="cursor-pointer"
              >
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => router.push("/my-samples")}
                className="cursor-pointer"
              >
                My Samples
              </DropdownMenuItem>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => router.push("/my-collections")}
                className="cursor-pointer"
              >
                My Collections
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={handleProfileClick}
                className="cursor-pointer"
              >
                Register as Artist
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => disconnect()}
            className="cursor-pointer text-red-600"
          >
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Subscribe
        isOpen={showSubscribe}
        onClose={() => setShowSubscribe(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </>
  );
};

export default ProfileDropdown;
