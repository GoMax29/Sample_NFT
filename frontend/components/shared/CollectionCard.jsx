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
  console.log("Collection data:", collection);
  const styleImage = styleImages[collection.style] || styleImages["Pop"];

  return (
    <Link
      href={`/collection/${collection.artistName}/${collection.collectionId}`}
      className="block w-64"
    >
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:scale-105 h-[400px] relative group">
        {/* Style Picto Image */}
        <div className="relative w-64 h-64 bg-black flex items-center justify-center">
          <img
            src={styleImage}
            alt={`${collection.style} style`}
            className="h-48 w-48 object-contain"
            onError={(e) => {
              console.error("Image failed to load:", styleImage);
              e.target.src = "/Pop.jpg";
            }}
          />
          {collection.avatarIPFS_URL && (
            <div className="absolute bottom-0 right-0 m-2">
              <img
                src={collection.avatarIPFS_URL}
                alt={collection.collectionName}
                className="w-12 h-12 rounded-full border-2 border-white"
              />
            </div>
          )}
        </div>

        <div className="p-4">
          {/* Collection Name */}
          <h3 className="text-2xl font-bold mb-2">
            {collection.collectionName}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            by {collection.artistName}
          </p>

          {/* Description tooltip on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-90 text-white p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <p className="text-center">{collection.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
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
