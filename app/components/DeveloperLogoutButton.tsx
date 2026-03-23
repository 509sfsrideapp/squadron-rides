"use client";

export default function DeveloperLogoutButton() {
  const handleLogout = async () => {
    try {
      await fetch("/api/developer/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Could not lock developer tools right now.");
    }
  };

  return (
    <button type="button" onClick={handleLogout}>
      Lock Dev Tools
    </button>
  );
}
