import React from "react";

const MaintenanceBanner = () => {
  return (
    <div style={styles.container}>
      <img
        src="/shantillon-logo.jpg" // Remplacez par le chemin de votre image
        alt="Site en maintenance"
        style={styles.image}
      />
      <h1 style={styles.title}>Nouvelle version en cours de préparation</h1>
      <p style={styles.text}>
        Notre plateforme revient bientôt avec des améliorations passionnantes !
      </p>
      <div style={styles.comingSoon}>COMING SOON</div>
    </div>
  );
};

const styles = {
  container: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#1a1a1a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    textAlign: "center",
    padding: "20px",
  },
  image: {
    maxWidth: "300px",
    marginBottom: "40px",
  },
  title: {
    color: "#fff",
    fontSize: "2.5rem",
    marginBottom: "20px",
  },
  text: {
    color: "#aaa",
    fontSize: "1.2rem",
    maxWidth: "600px",
    lineHeight: "1.6",
  },
  comingSoon: {
    position: "absolute",
    bottom: "40px",
    color: "rgba(255,255,255,0.1)",
    fontSize: "8rem",
    fontWeight: "bold",
    userSelect: "none",
  },
};

export default MaintenanceBanner;
