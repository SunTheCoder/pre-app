"use client";
import { useState } from 'react';
import Image from 'next/image';
import UploadModal from '@/components/UploadModal';

export default function UploadPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [reportData, setReportData] = useState(null);

  const handleUpload = async (files) => {
    setUploadedFiles(files);
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        setReportData(result); // result now has finalSchema + parseResult
      } else {
        console.error(result.error);
        alert('Error generating report: ' + result.error);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while processing the upload.');
    }

    setModalOpen(false);
  };

  function collapseSmallObjects(obj, indent = 2, depth = 0) {
    // Handle non-objects or null
    if (typeof obj !== 'object' || obj === null) {
      return JSON.stringify(obj);
    }

    // If it's an array, handle each element
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';

      const arrayItems = obj.map(item => collapseSmallObjects(item, indent, depth + 1));
      // Format each item on its own line if it's large, or inline if small
      const multiline = arrayItems.some(str => str.includes('\n'));
      if (!multiline && arrayItems.join(', ').length < 80) {
        // If everything is small enough, inline the entire array
        return `[ ${arrayItems.join(', ')} ]`;
      } else {
        // Otherwise, multiline
        const space = ' '.repeat(indent * (depth + 1));
        return `[\n${space}${arrayItems.join(`,\n${space}`)}\n${' '.repeat(indent * depth)}]`;
      }
    }

    // It's an object
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';

    // Check if all values are non-objects (so we can inline)
    const allNonObjects = keys.every(k => {
      const val = obj[k];
      return (typeof val !== 'object' || val === null);
    });

    // If small object (<=4 keys) and all non-object values → inline
    if (keys.length <= 4 && allNonObjects) {
      // e.g. { a: 1, b: "x", c: null }
      const inlineParts = keys.map(k => {
        return JSON.stringify(k) + ': ' + JSON.stringify(obj[k]);
      });
      return `{ ${inlineParts.join(', ')} }`;
    } else {
      // Otherwise, multi-line
      const space = ' '.repeat(indent * (depth + 1));
      const props = keys.map((k, i) => {
        const valueStr = collapseSmallObjects(obj[k], indent, depth + 1);
        return `${JSON.stringify(k)}: ${valueStr}`;
      });

      return `{\n${space}${props.join(`,\n${space}`)}\n${' '.repeat(indent * depth)}}`;
    }
  }


  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => setModalOpen(true)}>Upload Files</button>

      <UploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onUpload={handleUpload}
      />

      <h2>Preview:</h2>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {uploadedFiles.map((file, index) => {
          const fileURL = URL.createObjectURL(file);

          if (file.type.startsWith('image/')) {
            return (
              <div key={index}>
                <Image
                  src={fileURL}
                  alt={file.name}
                  width={200}
                  height={200}
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
                <p>{file.name}</p>
              </div>
            );
          } else if (file.type === 'application/pdf') {
            return (
              <div key={index} style={{ textAlign: 'center' }}>
                <iframe
                  src={fileURL}
                  title={file.name}
                  style={{ width: '200px', height: '200px', border: '1px solid #ccc' }}
                />
                <p>{file.name}</p>
              </div>
            );
          } else {
            return (
              <div key={index}>
                <p>Unsupported file type: {file.name}</p>
              </div>
            );
          }
        })}
      </div>

      {reportData && (
        <div style={{ marginTop: '20px' }}>
          <h2>Final Schema (DB Tables)</h2>
          <pre style={{
            background: '#272727',
            color: '#fff',
            padding: '10px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {collapseSmallObjects(reportData.finalSchema, null, 2)}
          </pre>

          <hr />
          <h3>LLM Parse Result (Raw)</h3>
          <pre style={{
            background: '#272727',
            color: '#fff',
            padding: '10px',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}>
            {collapseSmallObjects(reportData.parseResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
