"use client";

const CreateMusicPage = () => {
  // Array of vibrant colors for "some music"
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9B59B6",
  ];

  // Get random color for each letter
  const getColoredText = (text) => {
    return text.split("").map((letter, index) => (
      <span
        key={index}
        style={{ color: colors[Math.floor(Math.random() * colors.length)] }}
      >
        {letter}
      </span>
    ));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 gap-8">
      {/* First image - samples preview */}
      <img
        src="/my-sample-screen.jpg"
        alt="samples"
        className="w-1/2 rounded-lg shadow-md"
      />

      {/* Text section */}
      <div className="text-center text-2xl font-bold">
        <span className="text-black">
          Drag and drop your samples below and let's create{" "}
        </span>
        {getColoredText("some music!")}
      </div>

      {/* Second image - studio screen */}
      <img
        src="/Studio Screen.jpg"
        alt="Studio Screen"
        className="w-full rounded-lg shadow-xl"
        style={{
          maxHeight: "70vh",
          objectFit: "contain",
          width: "90vw",
        }}
      />
    </div>
  );
};

export default CreateMusicPage;
