"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateCollectionWorkflow } from "@/components/shared/CreateCollectionWorkflow";

const CreateCollectionModal = ({
  isOpen,
  onClose,
  registeredArtistName,
  availableStyles,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Collection</DialogTitle>
        </DialogHeader>
        <CreateCollectionWorkflow
          registeredArtistName={registeredArtistName}
          availableStyles={availableStyles}
          onSuccess={onClose}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateCollectionModal;
