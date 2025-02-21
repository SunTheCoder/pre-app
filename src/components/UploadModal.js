"use client";
import { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Modal from 'react-modal';

if (process.env.NODE_ENV !== 'test') {
  Modal.setAppElement('body');
}

const UploadModal = ({ isOpen, onClose, onUpload }) => {
  // We'll handle accepted + rejected in a single callback
  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    // If we have valid files, pass them up
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles);
    }
    // Log or handle rejections if needed
    if (fileRejections.length > 0) {
      console.warn("Some files were rejected:", fileRejections);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, open } = useDropzone({
    accept: {
      "image/*": [],
      "application/pdf": []
    },
    multiple: false,        // or 'true' if you want multiple
    noClick: true,          // We'll trigger file dialog manually on modal click
    noKeyboard: true,
    onDrop,                 // Called with accepted + rejected
  });

  // Clipboard paste events
  const handlePaste = useCallback((event) => {
    const items = event.clipboardData.items;
    let files = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
          files.push(file);
        }
      }
    }
    if (files.length > 0) {
      onUpload(files);
      event.preventDefault();
    }
  }, [onUpload]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('paste', handlePaste);
    } else {
      window.removeEventListener('paste', handlePaste);
    }
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, handlePaste]);

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Upload Files"
      className="upload-modal"
      overlayClassName="upload-modal-overlay"
    >
      <div
        {...getRootProps({
          onClick: open,
          style: {
            border: '2px dashed #ccc',
            padding: '40px',
            textAlign: 'center',
            cursor: 'pointer',
          },
        })}
      >
        <input {...getInputProps()} />
        <p>
          Drag & drop files here, paste from clipboard,
          or click to select a file (images & PDFs).
        </p>
      </div>
    </Modal>
  );
};

export default UploadModal;
