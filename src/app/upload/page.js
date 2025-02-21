"use client";
import { useState, useRef } from "react";
import UploadModal from "@/components/UploadModal";

/**
 * Example: Overlays bounding boxes on the recognized text, with a simple tooltip on hover.
 */
export default function UploadPage() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Dimensions of the displayed image
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  // Which annotation is currently hovered
  const [hoveredAnno, setHoveredAnno] = useState(null);

  // Basic offset for the tooltip
  const tooltipOffset = { x: 2, y: 0 };

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/parse-upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        // store a local preview URL plus the result from the server
        setReportData({
          fileUrl: URL.createObjectURL(file),
          ...result,
        });
      } else {
        console.error(result.error);
        alert("Error generating report: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while processing the upload.");
    }
    setUploadModalOpen(false);
  };

  // Called when <img> finishes loading
  const handleImageLoad = (e) => {
    const width = e.currentTarget.offsetWidth;
    const height = e.currentTarget.offsetHeight;
    setImgSize({ width, height });
  };

  /**
   * Convert raw bounding box coordinates to a CSS style object.
   * The bounding box might have up to 4 vertices, e.g.:
   * [
   *   { x: 100, y: 50 },
   *   { x: 200, y: 50 },
   *   { x: 200, y: 80 },
   *   { x: 100, y: 80 }
   * ]
   */
  const getBoxStyle = (vertices) => {
    if (!vertices || vertices.length === 0 || imgSize.width === 0) {
      return { display: "none" };
    }
    // Find minX, maxX, minY, maxY
    let minX = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = 0;

    vertices.forEach((v) => {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    });

    // Convert these to percentages
    const boxLeft = (minX / imgSize.width) * 100;
    const boxTop = (minY / imgSize.height) * 100;
    const boxWidth = ((maxX - minX) / imgSize.width) * 100;
    const boxHeight = ((maxY - minY) / imgSize.height) * 100;

    return {
      position: "absolute",
      left: `${boxLeft}%`,
      top: `${boxTop}%`,
      width: `${boxWidth}%`,
      height: `${boxHeight}%`,
      border: "2px solid rgba(255,0,0,0.8)",
      backgroundColor: "rgba(255,0,0,0.1)",
      pointerEvents: "auto", // so we can hover
    };
  };

  // Render the bounding boxes for each annotation
  const renderAnnotations = () => {
    if (!reportData?.personAnnotations || imgSize.width === 0) return null;

    return reportData.personAnnotations.map((anno, idx) => {
      const style = getBoxStyle(anno.vertices);
      return (
        <div
          key={idx}
          style={style}
          onMouseEnter={() => setHoveredAnno(anno)}
          onMouseLeave={() => setHoveredAnno(null)}
        />
      );
    });
  };

  // Render a tooltip near the hovered box
  const renderTooltip = () => {
    if (!hoveredAnno || hoveredAnno.vertices.length === 0) return null;

    // We'll position the tooltip at the top-left corner of the bounding box
    // or we can pick minX, minY from the box calculations again
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    hoveredAnno.vertices.forEach((v) => {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
    });

    // Convert to % for absolute positioning
    const leftPct = (minX / imgSize.width) * 100 + tooltipOffset.x;
    const topPct = (minY / imgSize.height) * 100 + tooltipOffset.y;

    // For label: cross-reference the finalSchema people
    let label = `Person #${hoveredAnno.person_id}`;
    if (reportData?.finalSchema?.people) {
      const found = reportData.finalSchema.people.find(
        (p) => p.person_id === hoveredAnno.person_id
      );
      if (found) {
        label = found.full_name;
      }
    }

    return (
      <div
        className="absolute z-50 bg-black text-white text-xs p-2 rounded"
        style={{
          left: `${leftPct}%`,
          top: `${topPct}%`,
          transform: "translate(-0%, -0%)", // if you want to offset the tooltip differently, adjust
          maxWidth: "200px",
        }}
      >
        {label}
      </div>
    );
  };

  return (
    <div className="p-5">
      <button
        onClick={() => setUploadModalOpen(true)}
        className="btn btn-primary mb-5"
      >
        Upload Files
      </button>
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      {reportData?.fileUrl && (
        <div
          style={{ position: "relative", width: "100%", maxWidth: "1000px" }}
          className="border border-gray-600"
        >
          {/* The image */}
          <img
            src={reportData.fileUrl}
            alt="Processed"
            style={{ width: "100%", display: "block" }}
            onLoad={handleImageLoad}
          />
          {/* The bounding box overlays */}
          {renderAnnotations()}
          {/* The tooltip */}
          {renderTooltip()}
        </div>
      )}
    </div>
  );
}
