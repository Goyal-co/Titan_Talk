import React, { useState, useEffect, useRef } from "react";

export default function UserDashboard({ user }) {
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const userProject = user?.project || "";

  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [stats, setStats] = useState({
    conversationsToday: 0,
    pitchAvg: 0,
    topObjections: 0,
  });
  const [conversations, setConversations] = useState([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [recording, setRecording] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const itemsPerPage = 5;

  useEffect(() => {
    if (userProject) fetchDashboardData();
  }, [userProject]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/recordings?project=${encodeURIComponent(userProject)}`);
      const data = await res.json();
      if (res.ok) {
        setConversations(data);
        
        // Calculate proper statistics
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = data.filter(d => d.date?.startsWith(today)).length;
        
        // Calculate average pitch score
        const validScores = data.filter(d => d.score && d.score > 0);
        const pitchAvg = validScores.length > 0 
          ? Math.round(validScores.reduce((sum, d) => sum + d.score, 0) / validScores.length)
          : 0;
        
        // Count total objections found
        const topObjections = data.filter(d => d.topObjection && d.topObjection !== 'None' && d.topObjection !== 'Analysis failed').length;
        
        setStats({ 
          conversationsToday: todayCount, 
          pitchAvg: pitchAvg, 
          topObjections: topObjections 
        });
      } else {
        console.error("Dashboard fetch failed:", data.message);
      }
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      window.currentStream = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolumeLevel(Math.min(100, volume));
        requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
  const audioBlob = new Blob(audioChunksRef.current, {
    type: "audio/webm;codecs=opus",
  });

  const formData = new FormData();
  formData.append("audio", audioBlob); // ✅ fixed: used correct variable
  formData.append("name", customerName);
  formData.append("phone", customerPhone);
  formData.append("email", user.email);        // Salesperson email
  formData.append("userName", user.name);      // Salesperson name
  formData.append("project", user.project);    // Assigned project

  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/recordings`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("✅ Recording saved successfully");
      setShowRecorder(false);
      setCustomerName("");
      setCustomerPhone("");
      fetchDashboardData();
    } else {
      alert("❌ Failed to save recording");
    }
  } catch (err) {
    console.error("Upload error:", err);
    alert("❌ Error uploading recording");
  }

  if (analyserRef.current) analyserRef.current.disconnect();
  if (window.currentStream) {
    window.currentStream.getTracks().forEach((track) => track.stop());
  }
};

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("❌ Microphone access denied or not working");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };

  const filteredConversations = conversations.filter(conv =>
    (conv.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conv.date || "").includes(searchTerm)
  );
  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentConversations = filteredConversations.slice(startIdx, startIdx + itemsPerPage);

  const handleSubmitFeedback = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userName,
          message: feedbackText,
          project: userProject,
        }),
      });
      if (res.ok) {
        alert("✅ Feedback submitted successfully!");
        setFeedbackText("");
        setShowFeedback(false);
      } else {
        alert("❌ Failed to submit feedback");
      }
    } catch (err) {
      console.error("Feedback error:", err);
      alert("❌ Server error");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7fbff] p-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Hi {userName}, <span className="wave">👋</span>
          </h1>
          <p className="text-gray-600">Welcome back! Here’s your summary for today.</p>
        </div>
        <button className="text-blue-600 font-medium hover:underline">Log out</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Conversations Today", value: stats.conversationsToday },
          { label: "Pitch Score Avg.", value: stats.pitchAvg },
          { label: "Top Objections Found", value: stats.topObjections },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl p-4 shadow-md">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Start Conversation */}
      <div className="mb-6">
        <button onClick={() => setShowRecorder(true)} className="bg-green-600 text-white px-5 py-2 rounded">
          🎤 Start Conversation
        </button>
      </div>

      {/* Recent Conversations */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Recent Conversations</h2>
        <input
          type="text"
          placeholder="Search by name or date (YYYY-MM-DD)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 w-full border p-2 rounded text-sm"
        />
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Date & Time</th>
              <th className="pb-2">Name</th>
              <th className="pb-2">Phone</th>
              <th className="pb-2">Score</th>
              <th className="pb-2">Missed Pros.</th>
              <th className="pb-2">Top Objection</th>
              <th className="pb-2">Recording</th>
            </tr>
          </thead>
          <tbody>
            {currentConversations.map((conv, idx) => (
              <tr key={idx} className="border-b text-gray-700">
                <td className="py-2">{formatDateTime(conv.date)}</td>
                <td>{conv.name || "-"}</td>
                <td>{conv.phone || "-"}</td>
                <td>{typeof conv.score === 'number' ? conv.score : '-'}</td>
                <td>{typeof conv.missedPros === 'number' ? conv.missedPros : '-'}</td>
                <td>{conv.topObjection || "-"}</td>
                <td className="flex items-center gap-2">
                  <audio controls className="w-32">
                    <source src={`${import.meta.env.VITE_BACKEND_URL}${conv.recordingUrl}`} type="audio/webm" />
                  </audio>
                  <a
                    href={`${import.meta.env.VITE_BACKEND_URL}${conv.recordingUrl}`}
                    download={`Recording_${conv.date}_${conv.name || "Customer"}.webm`}
                    className="text-xs text-blue-600 underline"
                  >
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`px-3 py-1 rounded ${currentPage === index + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md flex justify-around py-3 text-sm">
        <button onClick={() => setShowFeedback(true)} className="text-blue-600 font-semibold">Submit Feedback</button>
        <button onClick={() => window.open("https://wa.me/919686602879?text=Hi%20Support%20Team,%20I%20need%20help%20with%20Titan%20TalkIQ", "_blank")} className="text-blue-600 font-semibold">Help / Support</button>
      </div>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
            <h2 className="text-lg font-semibold mb-3">Submit Feedback</h2>
            <textarea className="w-full border rounded p-2 h-24 text-sm" placeholder="Type your feedback here..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setShowFeedback(false)} className="text-gray-500">Cancel</button>
              <button onClick={handleSubmitFeedback} className="bg-blue-600 text-white px-4 py-1 rounded">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* Recorder Modal */}
      {showRecorder && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
            <h2 className="text-lg font-semibold mb-3">New Conversation</h2>
            <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border p-2 mb-3 rounded" />
            <input type="tel" placeholder="Customer Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full border p-2 mb-4 rounded" />
            {!recording ? (
              <button onClick={startRecording} disabled={!customerName || !customerPhone} className="bg-blue-600 text-white px-4 py-2 rounded">🎙️ Start Recording</button>
            ) : (
              <button onClick={stopRecording} className="bg-red-600 text-white px-4 py-2 rounded">⏹ Stop Recording</button>
            )}
            {recording && (
              <div className="mt-4">
                <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-100" style={{ width: `${Math.min(volumeLevel, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Mic Input Level</p>
              </div>
            )}
            <div className="text-right mt-4">
              <button onClick={() => setShowRecorder(false)} className="text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
