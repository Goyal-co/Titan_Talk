import React, { useEffect, useState } from "react";

export default function ProsConsManager() {
  const [project, setProject] = useState("Orchid Platinum"); // Default
  const [pros, setPros] = useState([]);
  const [objections, setObjections] = useState([]);
  const [newPro, setNewPro] = useState("");
  const [newObjection, setNewObjection] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (project) fetchProsCons();
  }, [project]);

  const fetchProsCons = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/pros-cons?project=${encodeURIComponent(project)}`
      );
      const data = await res.json();
      if (res.ok) {
        setPros(data?.pros || []);
        setObjections(data?.objections || []);
      } else {
        setMessage("❌ Failed to fetch data");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setMessage("❌ Server error");
    }
  };

  const saveProsCons = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/pros-cons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, pros, objections }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Pros & Objections saved!");
      } else {
        setMessage("❌ Failed to save");
      }
    } catch (err) {
      console.error("Save error:", err);
      setMessage("❌ Server error");
    }
  };

  const handleAddPro = () => {
    if (newPro.trim()) {
      setPros([...pros, newPro.trim()]);
      setNewPro("");
    }
  };

  const handleAddObjection = () => {
    if (newObjection.trim()) {
      setObjections([...objections, newObjection.trim()]);
      setNewObjection("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7fbff] p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">🎯 Manage Pros & Objections</h1>

      {/* Project Picker */}
      <div className="mb-6">
        <label className="block mb-1 text-sm text-gray-700 font-medium">Select Project</label>
        <select
          className="border rounded px-3 py-2 w-full max-w-sm"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option>Orchid Platinum</option>
          <option>Orchid Salisbury</option>
          <option>Orchid Life</option>
          <option>Orchid Bloomsberry</option>
        </select>
      </div>

      {/* Pros */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">✅ Pros</h2>
        <ul className="list-disc list-inside mb-2 text-gray-800">
          {pros.map((pro, idx) => (
            <li key={idx}>{pro}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a pro..."
            value={newPro}
            onChange={(e) => setNewPro(e.target.value)}
            className="border p-2 rounded w-full max-w-sm"
          />
          <button onClick={handleAddPro} className="bg-green-600 text-white px-4 py-1 rounded">
            ➕ Add
          </button>
        </div>
      </div>

      {/* Objections */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">🚫 Top Objections</h2>
        <ul className="list-disc list-inside mb-2 text-gray-800">
          {objections.map((obj, idx) => (
            <li key={idx}>{obj}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add an objection..."
            value={newObjection}
            onChange={(e) => setNewObjection(e.target.value)}
            className="border p-2 rounded w-full max-w-sm"
          />
          <button onClick={handleAddObjection} className="bg-red-600 text-white px-4 py-1 rounded">
            ➕ Add
          </button>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={saveProsCons}
        className="bg-blue-600 text-white px-6 py-2 rounded font-medium"
      >
        💾 Save All Changes
      </button>

      {message && <p className="mt-4 text-sm text-gray-700">{message}</p>}
    </div>
  );
}
