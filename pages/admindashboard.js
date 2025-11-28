import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../src/firebase";
import { useRouter } from "next/router";

const AdminDashboard = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const router = useRouter();

  // Check if the user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.replace("/loginpage"); // Redirect if not logged in
      } else {
        setUser(currentUser);
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  const onDrop = (acceptedFiles) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  };

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        window.location.replace("/loginpage"); // Replaces current entry in history stack
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  };


  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ".pdf,.docx,.txt",
    maxFiles: 10,
  });

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("No files selected");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert(response.data.message);
      setFiles([]);
      setUploading(false);
    } catch (uploadError) {
      setUploading(false);
      setError("Error uploading files: " + uploadError.message);
    }
  };

  const handleRemoveFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };



  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <h1>VTU GPT Admin Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <i className="fas fa-user-shield"></i>
              <span>Admin</span>
            </div>
            <button
              onClick={handleSignOut}
              className="logout-btn"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="admin-container">
        <div className="dashboard-section">
          <h2>Document Management</h2>
          <p>Upload and manage documents for the VTU GPT knowledge base.</p>

          <div className="sync-info">
            <div className="sync-card">
              <h3><i className="fab fa-google-drive"></i> Google Drive Auto-Sync</h3>
              <p>Files uploaded to your Google Drive folder will be automatically processed every 5 minutes.</p>
              <div className="sync-details">
                <span>📁 Folder: VTU-GPT-Documents</span>
                <span>⏱️ Sync: Every 5 minutes</span>
                <span>📄 Supports: PDF, DOCX, TXT</span>
              </div>
            </div>
          </div>
        </div>

        <div className="upload-section">
          <div {...getRootProps()} className="dropzone">
            <input {...getInputProps()} />
            <div className="dropzone-content">
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Drag & drop files here, or click to select files</p>
              <small>Supported formats: PDF, DOCX, TXT (Max 10 files)</small>
            </div>
          </div>

          {files.length > 0 && (
            <div className="selected-files">
              <h3>Selected Files:</h3>
              <div className="file-list">
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-info">
                      <i className="fas fa-file"></i>
                      <span>{file.name}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="remove-file-btn"
                      title="Remove file"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="error">{error}</div>}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="upload-btn"
          >
            {uploading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-upload"></i>
                Upload Documents
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
