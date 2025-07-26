import React, { useState, useEffect } from "react";

export default function TeamManagement() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    project: ""
  });
  const [groupedTeam, setGroupedTeam] = useState({});
  const [showModal, setShowModal] = useState(false);

  const fetchGrouped = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/members`);
      const members = await res.json();

      const grouped = {};
      members.forEach((m) => {
        if (!grouped[m.project]) grouped[m.project] = [];
        grouped[m.project].push(m);
      });

      setGroupedTeam(grouped);
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ Member added successfully!");
        setFormData({ name: "", email: "", role: "", project: "" });
        setShowModal(false);
        fetchGrouped(); // refresh list
      } else {
        alert(`❌ Error: ${data.message || "Something went wrong"}`);
      }
    } catch (err) {
      console.error("Add Member Error:", err);
      alert("❌ Server error while adding member.");
    }
  };

  useEffect(() => {
    fetchGrouped(); // ✅ Trigger fetch on page load
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Team by Project</h1>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
          + Add Member
        </button>
      </div>

      {Object.keys(groupedTeam).length === 0 ? (
        <p className="text-gray-500">No team members found.</p>
      ) : (
        Object.entries(groupedTeam).map(([project, members]) => (
          <div key={project} className="mb-6">
            <h3 className="text-md font-bold text-blue-700 mb-2">📍 {project}</h3>
            <table className="w-full text-sm mb-3 bg-white shadow-sm rounded-lg">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member._id} className="border-b text-gray-700">
                    <td className="p-2">{member.name}</td>
                    <td className="p-2">{member.email}</td>
                    <td className="p-2">{member.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[400px]">
            <h2 className="text-xl font-bold mb-4">Add New Member</h2>
            <div className="space-y-3">
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="w-full p-2 border rounded" />
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-2 border rounded" />
              <input type="text" name="role" value={formData.role} onChange={handleChange} placeholder="Role (e.g., Sales Executive)" className="w-full p-2 border rounded" />
              <input type="text" name="project" value={formData.project} onChange={handleChange} placeholder="Assigned Project" className="w-full p-2 border rounded" />
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="text-gray-600">Cancel</button>
                <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-1 rounded">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
