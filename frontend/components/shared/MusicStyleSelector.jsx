import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const MusicStyleSelector = ({
  onChange,
  multiSelect = false, // Add prop to determine if multiple selection is allowed
  availableStyles = [
    // Default styles if none provided
    "Pop",
    "Rock",
    "Jazz",
    "Classical",
    "Electronic",
    "Hip Hop",
    "R&B",
    "Country",
    "Folk",
    "Metal",
  ],
}) => {
  const [selectedStyles, setSelectedStyles] = useState([]);

  const handleStyleClick = (style) => {
    if (multiSelect) {
      // Multiple selection logic for artist registration
      setSelectedStyles((prev) =>
        prev.includes(style)
          ? prev.filter((s) => s !== style)
          : [...prev, style]
      );
    } else {
      // Single selection logic for collection creation
      setSelectedStyles([style]);
    }
  };

  useEffect(() => {
    // Pass selected styles to parent component
    onChange(multiSelect ? selectedStyles : selectedStyles[0] || "");
  }, [selectedStyles, onChange, multiSelect]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {multiSelect ? "Music Styles" : "Collection Style"}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {availableStyles.map((style) => (
          <Button
            key={style}
            type="button"
            variant={selectedStyles.includes(style) ? "default" : "outline"}
            onClick={() => handleStyleClick(style)}
            className={`text-sm ${
              selectedStyles.includes(style)
                ? "bg-primary text-primary-foreground"
                : ""
            }`}
          >
            {style}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default MusicStyleSelector;
