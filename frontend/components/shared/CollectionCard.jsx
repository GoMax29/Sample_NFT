import React from "react";
import Link from "next/link";

// Style to image mapping - update paths to match your public directory structure
const styleImages = {
  Classical: "/Classical.jpg",
  Country: "/Country.jpg",
  Electronic: "/Electro.jpg",
  Folk: "/Folk.jpg",
  "Hip Hop": "/Hip Pop.jpg",
  Jazz: "/Jazz.jpg",
  Metal: "/Metal.jpg",
  Pop: "/Pop.jpg",
  "R&B": "/R&B.jpg",
  Rock: "/Rock.jpg",
};

const CollectionCard = ({ collection }) => {
  // Get the corresponding image for the collection's style
  const styleImage = styleImages[collection.style] || styleImages["Pop"]; // Default to Pop if style not found

  console.log("Style:", collection.style); // Debug log
  console.log("Image path:", styleImage); // Debug log

  return (
    <Link
      href={`/collection/${collection.artistName}/${collection.collectionId}`}
      className="block w-64 transition-transform hover:scale-105 hover:shadow-xl"
    >
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Style Picto Image */}
        <div className="relative w-64 h-64 bg-black flex items-center justify-center">
          <img
            src={styleImage}
            alt={`${collection.style} style`}
            className="h-48 w-48 object-contain"
            onError={(e) => {
              console.error("Image failed to load:", styleImage); // Debug log
              e.target.src = "/Pop.jpg"; // Fallback image
            }}
          />
          {collection.avatarIPFS_URL && (
            <div className="absolute bottom-0 right-0 m-2">
              <img
                src={collection.avatarIPFS_URL}
                alt={collection.name}
                className="w-12 h-12 rounded-full border-2 border-white"
              />
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-xl font-semibold mb-2">{collection.name}</h3>
          <p className="text-sm text-gray-500 mb-1">
            by {collection.artistName}
          </p>
          <p className="text-gray-600 mb-2 line-clamp-2">
            {collection.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
              {collection.style}
            </span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {collection.totalSamples} samples
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CollectionCard;
